# Packet contract, revision 1 (v0.3.0 and v0.3.1)

[JSON Schema 2020-12](../schema/claim-review-packet.v1.json) covers input packets,
native exports and history. Its filename is the published contract revision;
`schema_version` distinguishes legacy 1 from enriched 2. Import migrates version 1
packets from v0.2 to version 2; exports use 2. No fields are silently dropped.

## Native fields

Exact root fields: schema_version (1 or 2), sources (array <= 100), claims (array
<= 1000), reviews (array <= 10000). UTF-8 JSON without BOM, <= 5 MiB. Migrated
exports must also fit that bound, checked incrementally before accepting history.
No type coercion or dropped array entries. IDs are unique within each collection,
nonblank strings <= 200 UTF-16 units. Text rejects isolated surrogates. String
limits use UTF-16; standard JSON Schema maxLength counts code points, so the
runtime validator additionally enforces exact UTF-16 limits.

Version 1 source fields: id, title (nonblank <= 1000), text (possibly empty <=
100000), sha256 (lowercase 64-digit hex of exact original UTF-8 text). Version 2
adds nfc_sha256, the SHA-256 of text.normalize("NFC"). Text and raw hashes are
never normalized in place. Claim fields: id, text (nonblank <= 10000), citation_ids
(unique source IDs <= 100). Unknown references fail.

Version 1 review fields: id, claim_id, source_id, source_sha256, start, end,
verdict, rationale, reviewer. Rationale nonblank <= 4000, reviewer nonblank <= 200.
Verdict supported, partial, contradicted or unverifiable. References must name a
claim and its cited source. Offsets safe integers, 0 <= start < end <= 100000,
counted in UTF-16 units. Current-source spans must fit text and cannot split
surrogate pairs. Old-hash reviews are stale, so current text cannot validate or
supply their original passage.

Version 2 adds these exact review fields:

- source_nfc_sha256: original source's NFC hash, or null for migrated unavailable
  stale history.
- reviewer_identity_assurance: always "self-reported".
- text_quote: `{type: "TextQuoteSelector", exact, prefix, suffix}`. Exact is the
  original selected text. Prefix/suffix are the nearest up to 32 code points on
  each side, not 32 UTF-16 units. Empty context is allowed at source boundaries.
- text_position: `{type: "TextPositionSelector", start, end}`, counted in Unicode
  code points, inclusive start and exclusive end.

Quote, position and NFC identity are null together only when legacy stale history
cannot supply its missing original source. Current legacy reviews are enriched
from their verified original source. Available selectors remain recorded when a
source later changes, but never authorize reanchoring or quoting changed text.
Current reviews must match both selectors and source hashes exactly. Stale
selectors have checked field/range/length consistency, but their exact source
relationship is unverifiable without the original. An importer can fabricate
hashes and labels; this format has no cryptographic authorship or signatures.

Both direction conversions reject invalid integer/range offsets. UTF-16 offsets
inside surrogate pairs are rejected. Combining sequences may split at code-point
boundaries; they are not counted as a single grapheme. CRLF remains two code points
in imported plain text. Textarea positions map back to original CRLF UTF-16 units;
builder textarea reads arrive as LF and are hashed in that displayed form.

## History, normalization and storage

Appending requires current raw source hash and preserves history. Latest is last
append per claim/citation pair. Raw hash inequality always means stale. If the
recorded NFC hash still equals the current NFC hash, the UI labels the review
normalization-only stale. It remains stale, with no automatic offset movement or
current-source quote. Invalid imports and draft restores preserve current work.

JSON uses JSON.parse's last-key semantics for duplicate object keys; object-key
duplication is not an integrity signal. Collection IDs/citations are strictly
checked. Compact exports have no trailing newline and fit the import byte bound.

Packet draft storage is not accessed by default; theme preferences use a separate guarded key before paint. Checking Save draft on this device
writes the current canonical packet after import/build/save. Each new page starts
with saving off. Explicit restore reads and validates a stored packet; explicit
clear removes it. Every localStorage access is try/catch guarded. Storage failure
keeps the current packet in memory and disables saving. The beforeunload guard
remains until native export even if a draft exists. Browser/origin storage can be
cleared or unavailable, especially for local files; export remains necessary for
portable preservation. Drafts and exports may contain confidential supplied text.

## Validation and JSON-LD scope

The standalone browser parser uses a build-time precompiled AJV2020 validator from the published schema before semantic validation. No runtime code generation or unsafe-eval is required. `npm run validate:schema` also combines the published structural schema with parsePacket.
Schema alone cannot verify SHA-256, cross-record references, ID uniqueness, exact
UTF-16 caps, current selector equivalence, stale provenance or total UTF-8 bytes.
All packet fixtures and negative cases exercise the combined validator and
runtime parser. Both must accept valid imports/exports and reject malformed input.

W3C JSON-LD exports an AnnotationPage containing all review annotations, with
plain TextualBody claim/verdict/rationale, self-reported Person label, a
SpecificResource target identified by original raw SHA-256 URN, and both selectors.
The cr namespace carries native IDs, hashes, offsets and identity assurance.
The context URL is an identifier and is never fetched by this app. No third-party
import/conformance certification is claimed. Missing legacy stale selectors cause
an explicit whole-export error; native export retains that history.

The [W3C model](https://www.w3.org/TR/annotation-model/#text-quote-selector) requires
code-point selection and prefers grapheme boundaries. This adapter targets supplied
plain text only: markup-like strings are literal text rather than HTML to strip.
Published quote and position examples and offline `jsonld` 9.0.0 expansion/RDF
consumption are tested with a pinned local W3C context; see
[precise interoperability coverage](interoperability.md). Arbitrary annotation
application support remains unverified. JSON-LD export does not clear the unsaved guard because it is not the
native resumable packet.

No automatic judge, source retrieval, OCR/PDF extraction, server, accounts or
telemetry. One standalone HTML uses safe text sinks and a default-src none CSP
with only build-computed inline script/style hashes and explicit connect-src none.
The CSP denies network connections via default-src. Device storage is a browser
capability, not a network exception. MIT applies to code, not supplied source rights.
