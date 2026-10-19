import {
  parsePacket,
  requireValue,
  type Packet,
  type LegacyReview,
  type Verdict,
} from "./packet.js";
import { sha256 } from "./hash.js";
import { appendReview, latestReviews, reviewState } from "./reviews.js";
import { validSpan, sourceOffset } from "./spans.js";
import { buildPacket, clean, draftClaim } from "./builder.js";
import example from "../examples/packet.json";
import acceptance from "../examples/acceptance.json";
import acceptanceReviewed from "../examples/acceptance-reviewed.json";
import { webAnnotations } from "./annotation.js";
import { importTrace, labelExport, csvExport } from "./adapters.js";
import { agreement, mergePackets } from "./coordination.js";
import { setupViewer, celebrate } from "./viewer.js";
import { saveDraft, readDraft, clearDraft } from "./draft.js";

setupViewer();

function element<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing control ${id}`);
  return node as T;
}
function message(error: unknown): string {
  return String(error).replace(/^Error:\s*/, "");
}
let packet: Packet | null = null,
  generation = 0,
  lastExport = "",
  busyCount = 0,
  confirmBuilderUse = false,
  confirmExampleUse = "",
  pendingNativeImport: { next: Packet; previous: Packet | null; ticket: number } | null = null,
  queueWasComplete = false;
const claimControl = element<HTMLSelectElement>("claim");
const citationControl = element<HTMLSelectElement>("citation");
const sourceControl = element<HTMLTextAreaElement>("source-text");
const startControl = element<HTMLInputElement>("start"),
  endControl = element<HTMLInputElement>("end");
const status = element("status"),
  history = element("history");
const importControl = element<HTMLInputElement>("import");
const importConfirmation = element("import-confirmation");
function clearImportConfirmation(): void {
  pendingNativeImport = null;
  importConfirmation.hidden = true;
}
const builderSection = element("builder");
const builderToggle = element<HTMLButtonElement>("builder-toggle");
const builderStatus = element("builder-status");
const draftSave = element<HTMLInputElement>("draft-save");
draftSave.checked = false;
const busyControls = [
  importControl,
  element<HTMLButtonElement>("example"),
  element<HTMLButtonElement>("acceptance-example"),
  element<HTMLButtonElement>("acceptance-worked"),
  element<HTMLButtonElement>("export"),
  element<HTMLButtonElement>("export-w3c"),
  element<HTMLButtonElement>("draft-restore"),
  builderToggle,
];
function options(control: HTMLSelectElement, rows: { id: string; label: string }[]): void {
  control.replaceChildren(...rows.map((row) => new Option(row.label, row.id)));
}
function showOnStatus(node: HTMLElement, ok: boolean, text: string): void {
  node.textContent = text;
  node.classList.toggle("error", !ok);
  node.setAttribute("role", ok ? "status" : "alert");
  if (!ok) node.focus();
}
function setStatus(ok: boolean, text: string): void {
  showOnStatus(status, ok, text);
}
function setBusyStatus(ok: boolean, text: string): void {
  showOnStatus(builderStatus, ok, text);
}
function setBusy(busy: boolean): void {
  status.setAttribute("aria-busy", String(busy));
  for (const control of busyControls) control.toggleAttribute("disabled", busy);
}
function beginBusy(): void {
  busyCount++;
  setBusy(true);
}
function endBusy(): void {
  busyCount = Math.max(0, busyCount - 1);
  if (busyCount === 0) setBusy(false);
}
function isDirty(): boolean {
  return !!packet && JSON.stringify(packet) !== lastExport;
}
function source(): Packet["sources"][number] {
  const value = packet?.sources.find((row) => row.id === citationControl.value);
  requireValue(!!value, "Select a citation with source text");
  return value;
}
function showExcerpt(): void {
  if (!packet || !citationControl.value) return;
  const value = source(),
    start = Number(startControl.value),
    end = Number(endControl.value);
  const valid = validSpan(value.text, start, end);
  const excerpt = element("excerpt");
  excerpt.textContent = valid
    ? value.text.slice(start, end)
    : "Enter a span inside the source text";
  for (const id of ["claim-text", "source-panel"])
    element(id).classList.toggle("evidence-linked", valid);
  excerpt.classList.toggle("evidence-linked", valid);
  if (valid) {
    const glow = document.createElement("span");
    glow.className = "evidence-cursor";
    glow.setAttribute("aria-hidden", "true");
    excerpt.append(glow);
  }
}
function showSource(): void {
  if (!citationControl.value) {
    for (const id of ["claim-text", "source-panel", "excerpt"])
      element(id).classList.remove("evidence-linked");
    sourceControl.value = "";
    element("excerpt").textContent = "No cited source";
    element("source-identity").textContent = "No cited source";
    showReviewState();
    return;
  }
  const selected = source();
  sourceControl.value = selected.text;
  element("source-identity").textContent = `Source ${selected.id}. SHA-256: ${selected.sha256}`;
  startControl.value = "0";
  endControl.value = "0";
  showExcerpt();
  showReviewState();
}
function showClaim(): void {
  const claim = packet?.claims.find((row) => row.id === claimControl.value);
  element("claim-text").textContent = claim?.text ?? "No claim selected";
  options(
    citationControl,
    (claim?.citation_ids ?? []).map((id) => ({
      id,
      label: packet?.sources.find((row) => row.id === id)?.title ?? id,
    })),
  );
  showSource();
}
function showHistory(): void {
  if (packet) {
    const metrics = agreement(packet);
    const value = (n: number | null) => (n === null ? "Not enough ratings" : n.toFixed(3));
    element("agreement").textContent =
      `${metrics.reviewers.length} self-reported reviewer labels. ${metrics.complete_items} complete citation pairs; ${metrics.missing_ratings} missing ratings; ${metrics.excluded_stale} stale records excluded. Cohen kappa: ${value(metrics.cohen_kappa)}. Fleiss kappa: ${value(metrics.fleiss_kappa)}. Krippendorff alpha: ${value(metrics.krippendorff_alpha)}. Latest appended rating per reviewer is used; merged right-hand history takes precedence.`;
  } else
    element("agreement").textContent = "Import a packet to compare self-reported reviewer labels.";
  const total = packet?.claims.reduce((n, c) => n + c.citation_ids.length, 0) ?? 0;
  const done = packet
    ? latestReviews(packet).filter((r) => reviewState(packet!, r) === "valid").length
    : 0;
  element("queue-state").textContent =
    `${done} of ${total} citation pairs have current reviews. This is completion, not accuracy.`;
  const complete = total > 0 && done === total;
  if (complete && !queueWasComplete) celebrate();
  queueWasComplete = complete;
  const latest = new Set(packet ? latestReviews(packet).map((row) => row.id) : []);
  history.replaceChildren(
    ...(packet?.reviews ?? []).map((review) => {
      const row = document.createElement("p");
      row.dir = "auto";
      row.classList.toggle("stale", reviewState(packet!, review) !== "valid");
      row.textContent = `${review.id}: ${review.claim_id} / ${review.source_id} [${review.start},${review.end}) ${review.verdict} (${reviewState(packet!, review)}, ${latest.has(review.id) ? "latest" : "prior"}), ${review.reviewer}: ${review.rationale}`;
      const snapshot = packet!.sources.find((source) => source.id === review.source_id)!;
      row.textContent +=
        reviewState(packet!, review) === "valid"
          ? ` Passage: ${snapshot.text.slice(review.start, review.end)}`
          : " Original passage unavailable; changed source is not quoted.";
      return row;
    }),
  );
  element("packet-summary").textContent = packet
    ? `${packet.claims.length} claims, ${packet.sources.length} sources, ${packet.reviews.length} review records.`
    : "Import, build, or choose an example to begin.";
  showReviewState();
}
function showReviewState(): void {
  const node = element("review-state");
  const review = packet
    ? latestReviews(packet).find(
        (row) => row.claim_id === claimControl.value && row.source_id === citationControl.value,
      )
    : undefined;
  const state = review ? reviewState(packet!, review) : undefined;
  const stale = !!review && state !== "valid";
  node.classList.toggle("stale", stale);
  if (!review) {
    node.textContent = packet
      ? "Unreviewed. Select an exact passage, choose a verdict, and explain your human judgment."
      : "Your saved judgment for the selected claim and citation appears here.";
    return;
  }
  node.textContent = `Latest human judgment: ${review.verdict} (${state === "valid" ? "valid for current source" : state === "normalization-only stale" ? state : "stale source version"}). ${review.reviewer}: ${review.rationale} Bound to SHA-256: ${review.source_sha256}.`;
  node.textContent +=
    state === "valid"
      ? ` Passage: ${source().text.slice(review.start, review.end)}`
      : " Original passage unavailable; changed source is not quoted.";
}
function claimLabel(id: string, text: string): string {
  const points = Array.from(text);
  const short = points.length > 80 ? `${points.slice(0, 77).join("")}…` : text;
  return `${id}: ${short}`;
}
function usePacket(next: Packet, note: string): void {
  clearImportConfirmation();
  packet = next;
  queueWasComplete = false;
  confirmExampleUse = "";
  confirmBuilderUse = false;
  options(
    claimControl,
    next.claims.map((row) => ({ id: row.id, label: claimLabel(row.id, row.text) })),
  );
  showClaim();
  showHistory();
  setStatus(true, note);
  persistDraft();
}
function persistDraft(): void {
  if (draftSave.checked && !saveDraft(packet)) {
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
    if (ticket !== generation) return;
    usePacket(next, note);
  } finally {
    endBusy();
  }
}
importControl.addEventListener("change", async (event) => {
  const ticket = ++generation;
  const previous = packet;
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
      requireValue(ticket === generation && previous === packet, "Session changed; import again");
      if (isDirty()) {
        pendingNativeImport = { next, previous, ticket };
        importConfirmation.hidden = false;
        setStatus(false, "Unsaved packet work is kept until you confirm replacement.");
      } else {
        usePacket(next, "Imported packet. Export to keep changes.");
      }
    } finally {
      endBusy();
    }
  } catch (error) {
    if (ticket === generation)
      setStatus(false, `Import failed; current work kept: ${message(error)}`);
  } finally {
    (event.target as HTMLInputElement).value = "";
  }
});
element<HTMLButtonElement>("import-replace").addEventListener("click", () => {
  const pending = pendingNativeImport;
  if (!pending) return;
  clearImportConfirmation();
  if (pending.ticket !== generation || pending.previous !== packet) {
    setStatus(false, "Session changed; import the packet again.");
    return;
  }
  generation++;
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
    if (isDirty() && confirmExampleUse !== id) {
      confirmExampleUse = id;
      setStatus(
        false,
        `Unsaved packet work will be replaced. Click ${control.textContent} again to confirm. Export first to keep it.`,
      );
      return;
    }
    confirmExampleUse = "";
    const ticket = ++generation;
    void importText(JSON.stringify(data), ticket, note).catch((error) => {
      if (ticket === generation) setStatus(false, `Example failed: ${message(error)}`);
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
claimControl.addEventListener("change", showClaim);
citationControl.addEventListener("change", showSource);
startControl.addEventListener("input", showExcerpt);
endControl.addEventListener("input", showExcerpt);
element("selection").addEventListener("click", () => {
  if (!packet || !citationControl.value) return;
  startControl.value = String(sourceOffset(source().text, sourceControl.selectionStart));
  endControl.value = String(sourceOffset(source().text, sourceControl.selectionEnd));
  showExcerpt();
});
element<HTMLFormElement>("review-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const previous = packet,
    ticket = generation;
  try {
    requireValue(!!previous, "Import a packet first");
    const selected = source();
    let number = previous.reviews.length + 1;
    while (previous.reviews.some((row) => row.id === `review-${number}`)) number++;
    const review: LegacyReview = {
      id: `review-${number}`,
      claim_id: claimControl.value,
      source_id: selected.id,
      source_sha256: selected.sha256,
      start: Number(startControl.value),
      end: Number(endControl.value),
      verdict: element<HTMLSelectElement>("verdict").value as Verdict,
      rationale: element<HTMLTextAreaElement>("rationale").value,
      reviewer: element<HTMLInputElement>("reviewer").value,
    };
    const next = await parsePacket(JSON.stringify(appendReview(previous, review)), sha256);
    requireValue(ticket === generation && previous === packet, "Session changed; save again");
    packet = next;
    clearImportConfirmation();
    confirmExampleUse = "";
    confirmBuilderUse = false;
    showHistory();
    setStatus(true, "Saved review in memory. Export to keep it.");
    persistDraft();
  } catch (error) {
    setStatus(false, `Review not saved: ${message(error)}`);
  }
});
function download(raw: string, name: string, type = "application/json"): void {
  const url = URL.createObjectURL(new Blob([raw], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
element("export").addEventListener("click", () => {
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
  lastExport = raw;
  setStatus(true, "Export requested. Confirm your browser saved the file.");
});
element("export-w3c").addEventListener("click", () => {
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
    if (!saveDraft(packet)) {
      draftSave.checked = false;
      setStatus(false, "Device draft storage unavailable; work kept in memory.");
    } else setStatus(true, "Device draft saving enabled. Export to keep a portable copy.");
  } else setStatus(true, "Device draft saving off. Clear saved draft to remove the retained copy.");
});
element("draft-restore").addEventListener("click", () => {
  const saved = readDraft();
  if (!saved.available) {
    setStatus(false, "Device draft storage unavailable; current work kept.");
    return;
  }
  if (!saved.raw) {
    setStatus(false, "No saved draft on this device; current work kept.");
    return;
  }
  if (isDirty()) {
    setStatus(false, "Export current work before restoring a draft.");
    return;
  }
  const ticket = ++generation;
  void importText(saved.raw, ticket).catch((error) => {
    if (ticket === generation)
      setStatus(false, `Draft restore failed; current work kept: ${message(error)}`);
  });
});
element("draft-clear").addEventListener("click", () => {
  const cleared = clearDraft();
  setStatus(
    cleared,
    cleared
      ? "Saved draft cleared; current work kept in memory."
      : "Device draft storage unavailable; current work kept in memory.",
  );
});
globalThis.addEventListener("beforeunload", (event) => {
  if (isDirty()) event.preventDefault();
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
  const ticket = generation;
  beginBusy();
  try {
    const next = await builderPacket();
    if (ticket !== generation) {
      setBusyStatus(false, "Session changed while building; packet not applied.");
      return;
    }
    generation++;
    usePacket(next, "Built packet in memory. Save reviews, then export to keep them.");
    setBusyStatus(true, "Packet ready in the review form.");
  } catch (error) {
    setBusyStatus(false, message(error));
    return;
  } finally {
    endBusy();
  }
}
element("builder-use").addEventListener("click", () => {
  if (isDirty() && !confirmBuilderUse) {
    confirmBuilderUse = true;
    setBusyStatus(false, "Unsaved reviews will be replaced. Click Use packet again to confirm.");
    return;
  }
  confirmBuilderUse = false;
  void applyBuilderPacket();
});
element("builder-download").addEventListener("click", () => {
  const ticket = generation;
  beginBusy();
  void builderPacket()
    .then((next) => {
      if (ticket !== generation) {
        setBusyStatus(false, "Session changed while building; file not used.");
        return;
      }
      download(JSON.stringify(next), "packet.json");
      setBusyStatus(true, "Packet file download requested.");
    })
    .catch((error) => setBusyStatus(false, message(error)))
    .finally(() => endBusy());
});

function moveQueue(direction: number): void {
  if (!packet || busyCount) return;
  const pairs = packet.claims.flatMap((c) =>
    c.citation_ids.map((s) => ({ claim: c.id, source: s })),
  );
  const index = pairs.findIndex(
    (p) => p.claim === claimControl.value && p.source === citationControl.value,
  );
  for (let step = 1; step <= pairs.length; step++) {
    const next = pairs[(index + direction * step + pairs.length * 2) % pairs.length];
    const reviewed = latestReviews(packet).some(
      (r) =>
        r.claim_id === next.claim &&
        r.source_id === next.source &&
        reviewState(packet!, r) === "valid",
    );
    if (direction < 0 || !reviewed) {
      claimControl.value = next.claim;
      showClaim();
      citationControl.value = next.source;
      showSource();
      claimControl.focus();
      return;
    }
  }
  setStatus(true, "All citation pairs have current reviews. Export to preserve them.");
}
element("next-item").addEventListener("click", () => moveQueue(1));
element("previous-item").addEventListener("click", () => moveQueue(-1));
globalThis.addEventListener("keydown", (e) => {
  if (e.altKey && ["j", "k"].includes(e.key.toLowerCase())) {
    e.preventDefault();
    moveQueue(e.key.toLowerCase() === "j" ? 1 : -1);
  }
});
for (const kind of ["trace", "merge"] as const) {
  const control = element<HTMLInputElement>(`${kind}-import`);
  control.addEventListener("change", () => {
    const file = control.files?.[0];
    if (!file) return;
    if (kind === "trace" && isDirty()) {
      setStatus(false, "Export current work before importing a trace.");
      control.value = "";
      return;
    }
    const ticket = ++generation;
    const previous = packet;
    beginBusy();
    void (async () => {
      requireValue(file.size <= 5 * 1024 * 1024, "Import exceeds 5 MiB");
      const raw = await file.text();
      let next: Packet;
      if (kind === "trace") next = await importTrace(raw, sha256);
      else {
        requireValue(!!previous, "Import a base packet first");
        next = mergePackets(previous, await parsePacket(raw, sha256));
        next = await parsePacket(JSON.stringify(next), sha256);
      }
      requireValue(ticket === generation && previous === packet, "Session changed; import again");
      usePacket(
        next,
        kind === "trace"
          ? "Trace imported. Claims are unreviewed; supplied documents are candidate citations, actual use unverified."
          : "Reviewer histories merged. Export to preserve them.",
      );
    })()
      .catch((error) => {
        if (ticket === generation)
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

element("excerpt").addEventListener("pointermove", (event) => {
  if (
    document.hidden ||
    document.documentElement.dataset.paused === "true" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const excerpt = element("excerpt"),
    glow = excerpt.querySelector<HTMLElement>(".evidence-cursor");
  if (!glow) return;
  const bounds = excerpt.getBoundingClientRect();
  glow.style.transform = `translate3d(${event.clientX - bounds.left - 24}px,${event.clientY - bounds.top - 24}px,0)`;
});
