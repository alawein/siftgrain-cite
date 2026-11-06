import { buildPacket, clean, draftClaim } from "../core/builder.js";
import { sha256 } from "../core/hash.js";
import { requireValue, type Packet } from "../core/packet.js";
import { download, element, message } from "./dom.js";
import { beginBusy, endBusy, setBuilderStatus } from "./status.js";
import type { Store } from "./store.js";

export function mountBuilder(store: Store, onApplied: (note: string) => void): void {
  const builderSection = element("builder");
  const builderToggle = element<HTMLButtonElement>("builder-toggle");
  let confirmBuilderUse = false;
  store.subscribe(() => {
    confirmBuilderUse = false;
  });

  // Packet builder: creation-only mode alongside import. All validation flows through
  // parsePacket via buildPacket, so builder packets obey the same caps and hashes.
  function nextRowId(container: HTMLElement, prefix: "source" | "claim"): string {
    const used = new Set(
      Array.from(
        container.querySelectorAll<HTMLInputElement>(`[name='${prefix}-id']`),
        (control) => control.value,
      ),
    );
    let number = container.childElementCount + 1;
    while (used.has(`${prefix}-${number}`)) number++;
    return `${prefix}-${number}`;
  }
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
    id.value = nextRowId(builderSources, "source");
    const title = document.createElement("input");
    title.placeholder = "Synthetic refund policy…";
    title.maxLength = 1000;
    title.name = "source-title";
    title.value = `Source ${builderSources.childElementCount + 1}`;
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
    id.value = nextRowId(builderClaims, "claim");
    const text = document.createElement("input");
    text.placeholder = "State the claim in one sentence…";
    text.maxLength = 10000;
    text.name = "claim-text";
    const cite = document.createElement("textarea");
    cite.rows = 2;
    cite.placeholder = "policy-1, policy-2…";
    cite.name = "claim-citations";
    cite.spellcheck = false;
    const sources = builderSources.querySelectorAll<HTMLInputElement>("[name='source-id']");
    if (sources.length === 1 && sources[0].value.trim()) cite.value = sources[0].value;
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
    if (open) {
      const source = builderSources.querySelector<HTMLTextAreaElement>("[name='source-text']");
      source?.focus();
      source?.scrollIntoView({ block: "center" });
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
    const previous = store.get(),
      ticket = store.beginOperation();
    beginBusy();
    try {
      const next = await builderPacket();
      if (ticket !== store.ticket() || previous !== store.get()) {
        setBuilderStatus(false, "Session changed while building; packet not applied.");
        return;
      }
      store.set(next, ticket);
      onApplied("Built packet in memory. Save reviews, then export to keep them.");
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
      setBuilderStatus(
        false,
        "Unsaved reviews will be replaced. Click Use packet again to confirm.",
      );
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
}
