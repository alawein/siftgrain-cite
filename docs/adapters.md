# Adapter contracts

## Trace input

File uploads must be valid UTF-8. A leading UTF-8 BOM is allowed for traces and removed before parsing. Malformed bytes reject the whole import and preserve current work; a literal U+FFFD replacement character encoded as valid UTF-8 remains valid text.

Local JSON row, array, `{runs: [...]}` or nonblank JSONL rows. Row answer: outputs.answer, outputs.output or outputs.response or outputs.result (or flat answer/output/response). Sources: inputs.documents, inputs.context or flat documents/source_documents array or outputs.documents/source_documents. Exactly one answer alias and one document alias must be supplied; conflicts are rejected. Each document is a literal string or object with page_content/text and optional metadata.title/title. All supplied documents are attached as candidate citations for review; actual citation use is unverified. No source retrieval. IDs are deterministic run-N/source-M positions. Entire input is validated by parsePacket and fails atomically if any row is unsupported; 5MiB, source/claim caps and Unicode rules still apply. Arbitrary LangSmith trace trees/message arrays and vendor API connections are not supported.

## Merge and agreement

Reviewer packet uploads follow the native packet encoding contract: valid UTF-8 without a BOM. Invalid encoding rejects the merge and preserves current work.

Sources and claims must match exactly after sorting by ID; citation order is preserved. Conflicting duplicate review IDs fail. Exact duplicates deduplicate. Novel right-hand histories append after left-hand history. Last appended per claim/source/reviewer is the current nonstale rating used for agreement; labels do not establish independent humans. Stale records are excluded and counted. Metrics in DECISIONS.md; unit tests include hand-computed nontrivial coefficients and missing ratings. Complete-item counts accompany coefficients; no confidence interval is invented for a user-supplied packet.

## Analysis labels v1

schema/labels.v1.json describes the AIS/ALCE-oriented analysis interchange. Native scorer compatibility remains unverified: AIS is a rubric, not one universal JSON format, and ALCE scorer inputs require original questions/generations beyond packet fields. Interpretability is null; no first-stage judgment is fabricated. Current supported maps to attributable and binary citation_precision_label1; other current verdicts map to not_attributable/0. Stale records carry null attribution. No automatic scores are calculated. Every historical record includes raw source hash and self-reported identity. Native JSON is the resumable record; W3C export has the existing offline consumer tests.

CSV quotes every cell and prefixes potential spreadsheet formulas, including leading whitespace. This reduces formula interpretation on common importers; CSV import behavior varies. Preserve native packets for integrity metadata.
