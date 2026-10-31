import {
  parsePacket,
  requireValue,
  type Packet,
  type LegacyReview,
  type Verdict,
} from "../core/packet.js";
import { sha256 } from "../core/hash.js";
import { appendReview, latestReviews, reviewState } from "../core/reviews.js";
import { validSpan, sourceOffset } from "../core/spans.js";
import { agreement } from "../core/coordination.js";
import { element, message } from "./dom.js";
import { isBusy, setStatus } from "./status.js";
import type { Store } from "./store.js";

export function mountReview(
  store: Store,
  afterSave?: () => void,
): { refresh(): void; moveQueue(direction: number): void } {
  const claimControl = element<HTMLSelectElement>("claim");
  const citationControl = element<HTMLSelectElement>("citation");
  const sourceControl = element<HTMLTextAreaElement>("source-text");
  const startControl = element<HTMLInputElement>("start"),
    endControl = element<HTMLInputElement>("end");
  const history = element("history");

  function options(control: HTMLSelectElement, rows: { id: string; label: string }[]): void {
    control.replaceChildren(...rows.map((row) => new Option(row.label, row.id)));
  }
  function source(): Packet["sources"][number] {
    const value = store.get()?.sources.find((row) => row.id === citationControl.value);
    requireValue(!!value, "Select a citation with source text");
    return value;
  }
  function showExcerpt(): void {
    if (!store.get() || !citationControl.value) return;
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
    const packet = store.get();
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
    const packet = store.get();
    if (packet) {
      const metrics = agreement(packet);
      const value = (n: number | null) => (n === null ? "Not enough ratings" : n.toFixed(3));
      element("agreement").textContent =
        `${metrics.reviewers.length} self-reported reviewer labels. ${metrics.complete_items} complete citation pairs; ${metrics.missing_ratings} missing ratings; ${metrics.excluded_stale} stale records excluded. Cohen kappa: ${value(metrics.cohen_kappa)}. Fleiss kappa: ${value(metrics.fleiss_kappa)}. Krippendorff alpha: ${value(metrics.krippendorff_alpha)}. Latest appended rating per reviewer is used; merged right-hand history takes precedence.`;
    } else
      element("agreement").textContent =
        "Import a packet to compare self-reported reviewer labels.";
    const total = packet?.claims.reduce((n, c) => n + c.citation_ids.length, 0) ?? 0;
    const done = packet
      ? latestReviews(packet).filter((r) => reviewState(packet, r) === "valid").length
      : 0;
    element("queue-state").textContent =
      `${done} of ${total} citation pairs have current reviews. This is completion, not accuracy.`;
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
    const packet = store.get();
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
  function refresh(): void {
    const packet = store.get();
    options(
      claimControl,
      (packet?.claims ?? []).map((row) => ({ id: row.id, label: claimLabel(row.id, row.text) })),
    );
    showClaim();
    showHistory();
  }

  claimControl.addEventListener("change", showClaim);
  citationControl.addEventListener("change", showSource);
  startControl.addEventListener("input", showExcerpt);
  endControl.addEventListener("input", showExcerpt);
  element("selection").addEventListener("click", () => {
    if (!store.get() || !citationControl.value) return;
    startControl.value = String(sourceOffset(source().text, sourceControl.selectionStart));
    endControl.value = String(sourceOffset(source().text, sourceControl.selectionEnd));
    showExcerpt();
  });
  element<HTMLFormElement>("review-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const previous = store.get(),
      ticket = store.ticket();
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
      requireValue(
        ticket === store.ticket() && previous === store.get(),
        "Session changed; save again",
      );
      store.set(next, ticket);
      showHistory();
      setStatus(true, "Saved review in memory. Export to keep it.");
      afterSave?.();
    } catch (error) {
      setStatus(false, `Review not saved: ${message(error)}`);
    }
  });

  function moveQueue(direction: number): void {
    const packet = store.get();
    if (!packet || isBusy()) return;
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
          reviewState(packet, r) === "valid",
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

  return { refresh, moveQueue };
}
