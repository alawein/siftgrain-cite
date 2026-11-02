import { parsePacket, requireValue, type Packet } from "../core/packet.js";
import { sha256 } from "../core/hash.js";
import { webAnnotations } from "../core/annotation.js";
import { importTrace, labelExport, csvExport } from "../core/adapters.js";
import { mergePackets } from "../core/coordination.js";
import example from "../../examples/packet.json";
import acceptance from "../../examples/acceptance.json";
import acceptanceReviewed from "../../examples/acceptance-reviewed.json";
import { readDraft } from "./draft.js";
import { download, element, message } from "./dom.js";
import { beginBusy, endBusy, setStatus } from "./status.js";
import type { Store } from "./store.js";

export function decideImport(
  current: Packet | null,
  next: Packet,
  dirty: boolean,
): "replace" | "confirm" {
  // Even an identical incoming packet requires confirmation when the current work is dirty.
  return current && dirty ? "confirm" : "replace";
}

export function mountTransfer(store: Store, onApplied: (note: string) => void): void {
  let confirmExampleUse = "",
    pendingNativeImport: { next: Packet; previous: Packet | null; ticket: number } | null = null;
  const importControl = element<HTMLInputElement>("import");
  const importConfirmation = element("import-confirmation");

  function clearImportConfirmation(): void {
    pendingNativeImport = null;
    importConfirmation.hidden = true;
  }
  store.subscribe(() => {
    clearImportConfirmation();
    confirmExampleUse = "";
  });

  function usePacket(next: Packet, note: string, ticket?: number): void {
    store.set(next, ticket);
    onApplied(note);
  }

  async function importText(
    raw: string,
    ticket: number,
    note = "Imported packet. Export to keep changes.",
  ): Promise<void> {
    const previous = store.get();
    beginBusy();
    try {
      const next = await parsePacket(raw, sha256);
      if (ticket !== store.ticket()) return;
      requireValue(previous === store.get(), "Session changed; import again");
      usePacket(next, note, ticket);
    } finally {
      endBusy();
    }
  }

  importControl.addEventListener("change", async (event) => {
    const ticket = store.beginOperation();
    const previous = store.get();
    clearImportConfirmation();
    try {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      requireValue(file.size <= 5 * 1024 * 1024, "packet exceeds 5 MiB");
      const bytes = new Uint8Array(await file.arrayBuffer());
      requireValue(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), "BOM forbidden");
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      beginBusy();
      try {
        const next = await parsePacket(raw, sha256);
        requireValue(
          ticket === store.ticket() && previous === store.get(),
          "Session changed; import again",
        );
        if (decideImport(previous, next, store.isDirty()) === "confirm") {
          pendingNativeImport = { next, previous, ticket };
          importConfirmation.hidden = false;
          setStatus(false, "Unsaved packet work is kept until you confirm replacement.");
        } else {
          usePacket(next, "Imported packet. Export to keep changes.", ticket);
        }
      } finally {
        endBusy();
      }
    } catch (error) {
      if (ticket === store.ticket())
        setStatus(false, `Import failed; current work kept: ${message(error)}`);
    } finally {
      (event.target as HTMLInputElement).value = "";
    }
  });
  element<HTMLButtonElement>("import-replace").addEventListener("click", () => {
    const pending = pendingNativeImport;
    if (!pending) return;
    clearImportConfirmation();
    if (pending.ticket !== store.ticket() || pending.previous !== store.get()) {
      setStatus(false, "Session changed; import the packet again.");
      return;
    }
    usePacket(pending.next, "Imported packet. Export to keep changes.");
  });
  element<HTMLButtonElement>("import-keep").addEventListener("click", () => {
    if (!pendingNativeImport) return;
    clearImportConfirmation();
    setStatus(true, "Current packet kept; replacement cancelled.");
  });

  function exampleLoader(id: string, data: unknown, note: string): void {
    const control = element<HTMLButtonElement>(id);
    control.addEventListener("click", () => {
      if (store.isDirty() && confirmExampleUse !== id) {
        confirmExampleUse = id;
        setStatus(
          false,
          `Unsaved packet work will be replaced. Click ${control.textContent} again to confirm. Export first to keep it.`,
        );
        return;
      }
      confirmExampleUse = "";
      const ticket = store.beginOperation();
      void importText(JSON.stringify(data), ticket, note).catch((error) => {
        if (ticket === store.ticket()) setStatus(false, `Example failed: ${message(error)}`);
      });
    });
  }
  exampleLoader("example", example, "Imported packet. Export to keep changes.");
  exampleLoader(
    "acceptance-example",
    acceptance,
    "Imported acceptance example. All four claims are unreviewed. Add your human judgments, then export.",
  );
  exampleLoader(
    "acceptance-worked",
    acceptanceReviewed,
    "Synthetic worked judgments imported. These examples illustrate human reasoning, not an automatic grade.",
  );

  element("export").addEventListener("click", () => {
    const packet = store.get();
    if (!packet) {
      setStatus(false, "Import a packet first");
      return;
    }
    const raw = JSON.stringify(packet);
    if (new TextEncoder().encode(raw).byteLength > 5 * 1024 * 1024) {
      setStatus(false, "Export exceeds the 5 MiB import limit; export not created.");
      return;
    }
    download(raw, "claim-review.json");
    store.markExported(raw);
    setStatus(true, "Export requested. Confirm your browser saved the file.");
  });
  element("export-w3c").addEventListener("click", () => {
    const packet = store.get();
    try {
      requireValue(!!packet, "Import a packet first");
      download(
        JSON.stringify(webAnnotations(packet)),
        "claim-review-annotations.jsonld",
        "application/ld+json",
      );
      setStatus(
        true,
        "W3C export requested. Export the native packet to preserve resumable history.",
      );
    } catch (error) {
      setStatus(false, message(error));
    }
  });

  element("draft-restore").addEventListener("click", () => {
    const saved = readDraft();
    if (!saved.available) {
      element<HTMLInputElement>("draft-save").checked = false;
      setStatus(false, "Device draft storage unavailable; current work kept.");
      return;
    }
    if (!saved.raw) {
      setStatus(false, "No saved draft on this device; current work kept.");
      return;
    }
    if (store.isDirty()) {
      setStatus(false, "Export current work before restoring a draft.");
      return;
    }
    const ticket = store.beginOperation();
    void importText(saved.raw, ticket).catch((error) => {
      if (ticket === store.ticket())
        setStatus(false, `Draft restore failed; current work kept: ${message(error)}`);
    });
  });

  for (const kind of ["trace", "merge"] as const) {
    const control = element<HTMLInputElement>(`${kind}-import`);
    control.addEventListener("change", () => {
      const file = control.files?.[0];
      if (!file) return;
      if (kind === "trace" && store.isDirty()) {
        setStatus(false, "Export current work before importing a trace.");
        control.value = "";
        return;
      }
      const ticket = store.beginOperation();
      const previous = store.get();
      beginBusy();
      void (async () => {
        requireValue(file.size <= 5 * 1024 * 1024, "Import exceeds 5 MiB");
        const bytes = new Uint8Array(await file.arrayBuffer());
        requireValue(
          kind !== "merge" || !(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf),
          "BOM forbidden",
        );
        const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        let next: Packet;
        if (kind === "trace") next = await importTrace(raw, sha256);
        else {
          requireValue(!!previous, "Import a base packet first");
          next = mergePackets(previous, await parsePacket(raw, sha256));
          next = await parsePacket(JSON.stringify(next), sha256);
        }
        requireValue(
          ticket === store.ticket() && previous === store.get(),
          "Session changed; import again",
        );
        usePacket(
          next,
          kind === "trace"
            ? "Trace imported. Claims are unreviewed; supplied documents are candidate citations, actual use unverified."
            : "Reviewer histories merged. Export to preserve them.",
          ticket,
        );
      })()
        .catch((error) => {
          if (ticket === store.ticket())
            setStatus(false, `Import failed; current work kept: ${message(error)}`);
        })
        .finally(() => {
          control.value = "";
          endBusy();
        });
    });
  }

  for (const format of ["ais", "alce", "csv"] as const)
    element(`export-${format}`).addEventListener("click", () => {
      const packet = store.get();
      if (!packet) {
        setStatus(false, "Import a packet first");
        return;
      }
      download(
        format === "csv" ? csvExport(packet) : JSON.stringify(labelExport(packet, format)),
        `claim-review.${format === "csv" ? "csv" : `${format}.json`}`,
        format === "csv" ? "text/csv" : "application/json",
      );
      setStatus(true, "Label export requested. Native packet export preserves resumable history.");
    });
}
