import { requireValue, type Packet } from "./packet";

// Plain text export only. Context is an identifier; the app never retrieves it.
export function webAnnotations(packet: Packet) {
  requireValue(
    packet.reviews.every((review) => review.text_quote !== null && review.text_position !== null),
    "W3C export unavailable for migrated stale history without original selectors; export the native packet",
  );
  return {
    "@context": [
      "http://www.w3.org/ns/anno.jsonld",
      { cr: "https://github.com/alawein/claim-review/ns#" },
    ],
    type: "AnnotationPage",
    items: packet.reviews.map((review) => ({
      id: `urn:claim-review:annotation:${review.source_sha256}:${encodeURIComponent(review.id)}`,
      type: "Annotation",
      motivation: "assessing",
      creator: { type: "Person", name: review.reviewer },
      "cr:reviewer_identity_assurance": review.reviewer_identity_assurance,
      "cr:claim_id": review.claim_id,
      "cr:source_id": review.source_id,
      "cr:source_sha256": review.source_sha256,
      "cr:source_nfc_sha256": review.source_nfc_sha256,
      "cr:utf16_start": review.start,
      "cr:utf16_end": review.end,
      body: [
        {
          type: "TextualBody",
          purpose: "describing",
          value: packet.claims.find((claim) => claim.id === review.claim_id)!.text,
          format: "text/plain",
        },
        { type: "TextualBody", purpose: "assessing", value: review.verdict, format: "text/plain" },
        {
          type: "TextualBody",
          purpose: "commenting",
          value: review.rationale,
          format: "text/plain",
        },
      ],
      target: {
        type: "SpecificResource",
        source: { id: `urn:sha256:${review.source_sha256}`, type: "Text", format: "text/plain" },
        selector: [review.text_quote, review.text_position],
      },
    })),
  };
}
