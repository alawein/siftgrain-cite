import {
  assertReview,
  enrichReview,
  parseReview,
  requireValue,
  type Packet,
  type Review,
  type LegacyReview,
} from "./packet";
export function reviewState(
  packet: Packet,
  review: LegacyReview | Review,
): "valid" | "stale" | "normalization-only stale" {
  const source = packet.sources.find((row) => row.id === review.source_id);
  if (source?.sha256 === review.source_sha256) return "valid";
  return "source_nfc_sha256" in review &&
    review.source_nfc_sha256 !== null &&
    source?.nfc_sha256 === review.source_nfc_sha256
    ? "normalization-only stale"
    : "stale";
}
export function latestReviews(packet: Packet): Review[] {
  const map = new Map<string, Review>();
  for (const review of packet.reviews)
    map.set(JSON.stringify([review.claim_id, review.source_id]), review);
  return [...map.values()];
}
export function appendReview(packet: Packet, input: LegacyReview | Review): Packet {
  const review = enrichReview(packet, parseReview(input));
  assertReview(packet, review);
  requireValue(reviewState(packet, review) === "valid", "cannot save review against stale source");
  requireValue(!packet.reviews.some((row) => row.id === review.id), "duplicate review ID");
  requireValue(packet.reviews.length < 10000, "review limit reached");
  requireValue(
    review.rationale.trim().length > 0 &&
      review.rationale.length <= 4000 &&
      review.reviewer.trim().length > 0 &&
      review.reviewer.length <= 200,
    "rationale and reviewer required",
  );
  return { ...packet, reviews: [...packet.reviews, review] };
}
