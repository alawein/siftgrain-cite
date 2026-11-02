import { assertReview, requireValue, type Packet, type Review, type Verdict } from "./packet.js";
import { reviewState } from "./reviews.js";
function population(p: Packet): string {
  return JSON.stringify([
    [...p.sources].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    [...p.claims].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
  ]);
}
export function mergePackets(a: Packet, b: Packet): Packet {
  requireValue(population(a) === population(b), "merge population mismatch");
  const rows = new Map(a.reviews.map((r) => [r.id, r]));
  for (const r of b.reviews) {
    assertReview(a, r);
    const old = rows.get(r.id);
    requireValue(!old || JSON.stringify(old) === JSON.stringify(r), "review ID collision");
    rows.set(r.id, r);
  }
  requireValue(rows.size <= 10000, "review limit reached");
  return { ...a, reviews: [...rows.values()] };
}
export function agreement(p: Packet) {
  const reviewers = [...new Set(p.reviews.map((r) => r.reviewer))].sort();
  const items = p.claims.flatMap((c) => c.citation_ids.map((s) => JSON.stringify([c.id, s])));
  const latest = new Map<string, Review>();
  let excluded_stale = 0;
  for (const r of p.reviews) {
    if (reviewState(p, r) !== "valid") {
      excluded_stale++;
      continue;
    }
    latest.set(JSON.stringify([r.claim_id, r.source_id, r.reviewer]), r);
  }
  const groups = new Map<string, Map<string, Verdict>>();
  for (const r of latest.values()) {
    const key = JSON.stringify([r.claim_id, r.source_id]);
    const group = groups.get(key) ?? new Map<string, Verdict>();
    group.set(r.reviewer, r.verdict);
    groups.set(key, group);
  }
  // Sparse by supplied ratings, never allocate population x reviewer cells.
  const complete = [...groups.values()]
    .filter((row) => reviewers.length >= 2 && row.size === reviewers.length)
    .map((row) => reviewers.map((reviewer) => row.get(reviewer)!));
  const labels = ["supported", "partial", "contradicted", "unverifiable"];
  const ratio = (observed: number, expected: number) =>
    expected === 1 ? null : (observed - expected) / (1 - expected);
  let cohen_kappa: number | null = null,
    fleiss_kappa: number | null = null,
    krippendorff_alpha: number | null = null;
  if (reviewers.length === 2 && complete.length) {
    const po = complete.filter((r) => r[0] === r[1]).length / complete.length;
    const pe = labels.reduce(
      (sum, l) =>
        sum +
        (complete.filter((r) => r[0] === l).length * complete.filter((r) => r[1] === l).length) /
          complete.length ** 2,
      0,
    );
    cohen_kappa = ratio(po, pe);
  }
  if (complete.length) {
    const n = reviewers.length,
      N = complete.length;
    const counts = complete.map((row) => labels.map((l) => row.filter((v) => v === l).length));
    const po =
      counts.reduce(
        (sum, row) => sum + row.reduce((s, c) => s + c * (c - 1), 0) / (n * (n - 1)),
        0,
      ) / N;
    const pe = labels.reduce(
      (sum, _, i) => sum + (counts.reduce((s, r) => s + r[i], 0) / (N * n)) ** 2,
      0,
    );
    fleiss_kappa = ratio(po, pe);
  }
  // Nominal alpha coincidence weighting supports unequal numbers of raters.
  const usable = [...groups.values()].map((r) => [...r.values()]).filter((r) => r.length >= 2);
  const total = usable.reduce((s, r) => s + r.length, 0);
  if (total > 1) {
    const observed =
      usable.reduce(
        (s, r) =>
          s +
          labels.reduce((n, label) => {
            const c = r.filter((v) => v === label).length;
            return n + c * (r.length - c);
          }, 0) /
            (r.length - 1),
        0,
      ) / total;
    const counts = labels.map((l) =>
      usable.reduce((s, r) => s + r.filter((v) => v === l).length, 0),
    );
    const expected = counts.reduce((s, c) => s + c * (total - c), 0) / (total * (total - 1));
    if (expected > 0) krippendorff_alpha = 1 - observed / expected;
  }
  return {
    reviewers,
    identity_assurance: "self-reported",
    total_items: items.length,
    complete_items: complete.length,
    missing_ratings: items.length * reviewers.length - latest.size,
    excluded_stale,
    cohen_kappa,
    fleiss_kappa,
    krippendorff_alpha,
  };
}
