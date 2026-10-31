# Tested annotation interoperability

The export is consumed offline by `jsonld` 9.0.0 (development dependency only),
using JSON-LD expansion and conversion to RDF N-Quads. This confirms resolution
of the W3C selector types, source URNs and annotation vocabulary. It does not
certify arbitrary annotation applications or implement W3C import/reanchoring.
The independent consumer operates outside the application bundle.

The context file [anno-context.jsonld](../fixtures/anno-context.jsonld) was
downloaded from [W3C](https://www.w3.org/ns/anno.jsonld) on October 8, 2026.
Its exact SHA-256 is
`c10fd886c5c726fbfd51747b8677eb8f7d02c039357269622de7382e5c20d410`.
The test loader accepts only the exported `http://www.w3.org/ns/anno.jsonld`
identifier and returns these pinned local bytes. Every other context request
fails. The URI is data in claim-review; the product never loads it or fetches
source text. A third-party consumer's default loader may fetch it unless configured.

[Frozen synthetic fixtures](../fixtures/annotation-interop.json) cover emoji,
rare CJK, mathematical astral symbols, decomposed combining marks, CRLF, both
source boundaries, repeated quotes with differing context and normalization-only
source changes. Every export selects `TextQuoteSelector.exact` by code-point
positions; prefix and suffix each contain at most 32 code points. Combining
marks remain individual code points, without a grapheme-boundary guarantee.

Exact raw source hashes remain authoritative for original bytes. Matching NFC
hashes do not make a changed source original, move old offsets or remove staleness.
The unchanged recorded selectors and source URNs survive native reimport.
Migrated legacy stale history without original selectors explicitly fails the
entire W3C export. Its native export/reimport retains every judgment and does
not invent original evidence. UTF-16 native offsets and v0.2/v0.3 migration
semantics are unchanged in v0.3.1.

Run `npm test -- src/core/interoperability.test.ts`. Existing browser tests also
exercise CSP, local-file offline operation, storage failures and beforeunload.
This work does not change those product code paths.
