import { parsePacket, requireValue, type Packet } from "./core/packet.js";
import { sha256 } from "./core/hash.js";
import { buildPacket, clean, draftClaim } from "./core/builder.js";
import example from "../examples/packet.json";
import acceptance from "../examples/acceptance.json";
import acceptanceReviewed from "../examples/acceptance-reviewed.json";
import { webAnnotations } from "./core/annotation.js";
import { importTrace, labelExport, csvExport } from "./core/adapters.js";
import { mergePackets } from "./core/coordination.js";
import { setupViewer } from "./ui/viewer.js";
import { saveDraft, readDraft, clearDraft } from "./ui/draft.js";
import { element, message } from "./ui/dom.js";
import { beginBusy, endBusy, setStatus, setBuilderStatus } from "./ui/status.js";
import { mountReview } from "./ui/review.js";
import { createStore } from "./ui/store.js";

setupViewer();

const store = createStore();
let confirmBuilderUse = false,
  confirmExampleUse = "",
  pendingNativeImport: { next: Packet; previous: Packet | null; ticket: number } | null = null;
const importControl = element<HTMLInputElement>("import");
const importConfirmation = element("import-confirmation");
function clearImportConfirmation(): void {
  pendingNativeImport = null;
  importConfirmation.hidden = true;
}
const builderSection = element("builder");
const builderToggle = element<HTMLButtonElement>("builder-toggle");
const draftSave = element<HTMLInputElement>("draft-save");
draftSave.checked = false;
const review = mountReview(store, persistDraft);
store.subscribe(() => {
  clearImportConfirmation();
  confirmExampleUse = "";
  confirmBuilderUse = false;
});
function usePacket(next: Packet, note: string, ticket?: number): void {
  store.set(next, ticket);
  review.refresh();
  setStatus(true, note);
  persistDraft();
}
function persistDraft(): void {
  if (draftSave.checked && !saveDraft(store.get())) {
    draftSave.checked = false;
    setStatus(false, "Device draft storage unavailable; work kept in memory. Export to keep it.");
  }
}
async function importText(
  raw: string,
  ticket: number,
  note = "Imported packet. Export to keep changes.",
): Promise<void> {
  beginBusy();
  try {
    const next = await parsePacket(raw, sha256);
    if (ticket !== store.ticket()) return;
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
      if (store.isDirty()) {
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
function download(raw: string, name: string, type = "application/json"): void {
  const url = URL.createObjectURL(new Blob([raw], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
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
draftSave.addEventListener("change", () => {
  if (draftSave.checked) {
    if (!saveDraft(store.get())) {
      draftSave.checked = false;
      setStatus(false, "Device draft storage unavailable; work kept in memory.");
    } else setStatus(true, "Device draft saving enabled. Export to keep a portable copy.");
  } else setStatus(true, "Device draft saving off. Clear saved draft to remove the retained copy.");
});
element("draft-restore").addEventListener("click", () => {
  const saved = readDraft();
  if (!saved.available) {
    draftSave.checked = false;
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
element("draft-clear").addEventListener("click", () => {
  const cleared = clearDraft();
  if (!cleared) draftSave.checked = false;
  setStatus(
    cleared,
    cleared
      ? "Saved draft cleared; current work kept in memory."
      : "Device draft storage unavailable; current work kept in memory.",
  );
});
globalThis.addEventListener("beforeunload", (event) => {
  if (store.isDirty()) event.preventDefault();
});

// Packet builder: creation-only mode alongside import. All validation flows through
// parsePacket via buildPacket, so builder packets obey the same caps and hashes.
function addSourceRow(): void {
  const group = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = `Source ${builderSources.childElementCount + 1}`;
  group.append(legend);
  const id = document.createElement("input");
  id.placeholder = "policy-1…";
  id.maxLength = 200;
  id.name = "source-id";
  id.spellcheck = false;
  const title = document.createElement("input");
  title.placeholder = "Synthetic refund policy…";
  title.maxLength = 1000;
  title.name = "source-title";
  const text = document.createElement("textarea");
  text.rows = 4;
  text.placeholder = "Paste exact source text…";
  text.name = "source-text";
  builderField(group, "Source id", id);
  builderField(group, "Source title", title);
  builderField(group, "Source text", text);
  const hashLine = document.createElement("p");
  hashLine.textContent = "SHA-256 appears after typing.";
  group.append(hashLine);
  const update = (): void => {
    void sha256(clean(text.value))
      .then((digest) => {
        hashLine.textContent = `SHA-256: ${digest.slice(0, 16)}…`;
      })
      .catch(() => {
        hashLine.textContent = "SHA-256 unavailable in this browser context";
      });
  };
  text.addEventListener("input", update);
  group.dataset.row = "source";
  builderSources.append(group);
}
function addClaimRow(): void {
  const group = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = `Claim ${builderClaims.childElementCount + 1}`;
  group.append(legend);
  const id = document.createElement("input");
  id.placeholder = "c1…";
  id.maxLength = 200;
  id.name = "claim-id";
  id.spellcheck = false;
  const text = document.createElement("input");
  text.placeholder = "State the claim in one sentence…";
  text.maxLength = 10000;
  text.name = "claim-text";
  const cite = document.createElement("input");
  cite.placeholder = "policy-1, policy-2…";
  cite.name = "claim-citations";
  cite.spellcheck = false;
  builderField(group, "Claim id", id);
  builderField(group, "Claim text", text);
  builderField(group, "Citations (comma or newline separated)", cite);
  group.dataset.row = "claim";
  builderClaims.append(group);
}
function builderField(
  parent: HTMLElement,
  label: string,
  control: HTMLInputElement | HTMLTextAreaElement,
): void {
  const tag = document.createElement("label");
  tag.textContent = label;
  tag.append(control);
  parent.append(tag);
}
const builderSources = element("builder-sources");
const builderClaims = element("builder-claims");
function fieldIn(group: Element, selector: string): HTMLInputElement | HTMLTextAreaElement {
  const control = group.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  requireValue(!!control, "builder row is missing a control");
  return control;
}
function readBuilderSources(): { id: string; title: string; text: string }[] {
  return Array.from(builderSources.querySelectorAll("[data-row='source']")).map((group) => ({
    id: fieldIn(group, "[name='source-id']").value,
    title: fieldIn(group, "[name='source-title']").value,
    text: fieldIn(group, "[name='source-text']").value,
  }));
}
function readBuilderClaims() {
  return Array.from(builderClaims.querySelectorAll("[data-row='claim']")).map((group) => ({
    id: fieldIn(group, "[name='claim-id']").value,
    text: fieldIn(group, "[name='claim-text']").value,
    citations: fieldIn(group, "[name='claim-citations']").value,
  }));
}
builderToggle.addEventListener("click", () => {
  const open = builderSection.hidden;
  builderSection.hidden = !open;
  confirmBuilderUse = false;
  builderToggle.setAttribute("aria-expanded", String(open));
  builderToggle.textContent = open ? "Hide packet builder" : "New packet";
  if (open && !builderSources.childElementCount) {
    addSourceRow();
    addClaimRow();
  }
});
element("builder-add-source").addEventListener("click", addSourceRow);
element("builder-add-claim").addEventListener("click", addClaimRow);
async function builderPacket(): Promise<Packet> {
  return buildPacket(
    {
      sources: readBuilderSources(),
      claims: readBuilderClaims().map((row) => {
        const list = row.citations
          .split(/[\n,]+/)
          .map((part) => part.trim())
          .filter((part) => part.length > 0);
        return draftClaim(row.id, row.text, list);
      }),
    },
    sha256,
  );
}
async function applyBuilderPacket(): Promise<void> {
  const ticket = store.ticket();
  beginBusy();
  try {
    const next = await builderPacket();
    if (ticket !== store.ticket()) {
      setBuilderStatus(false, "Session changed while building; packet not applied.");
      return;
    }
    usePacket(next, "Built packet in memory. Save reviews, then export to keep them.");
    setBuilderStatus(true, "Packet ready in the review form.");
  } catch (error) {
    setBuilderStatus(false, message(error));
    return;
  } finally {
    endBusy();
  }
}
element("builder-use").addEventListener("click", () => {
  if (store.isDirty() && !confirmBuilderUse) {
    confirmBuilderUse = true;
    setBuilderStatus(false, "Unsaved reviews will be replaced. Click Use packet again to confirm.");
    return;
  }
  confirmBuilderUse = false;
  void applyBuilderPacket();
});
element("builder-download").addEventListener("click", () => {
  const ticket = store.ticket();
  beginBusy();
  void builderPacket()
    .then((next) => {
      if (ticket !== store.ticket()) {
        setBuilderStatus(false, "Session changed while building; file not used.");
        return;
      }
      download(JSON.stringify(next), "packet.json");
      setBuilderStatus(true, "Packet file download requested.");
    })
    .catch((error) => setBuilderStatus(false, message(error)))
    .finally(() => endBusy());
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
