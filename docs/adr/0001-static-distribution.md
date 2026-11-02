# ADR 1: Standalone static distribution

Accepted in October 4 owner-reviewed scope: public MIT browser tool, Pages and
GitHub-only standalone HTML/offline ZIP. No backend, model, credentials, domain,
account, telemetry, npm publisher or paid infrastructure. Same HTML hosted and
packaged offline. Recover with reviewed patch/new release and immutable tags.

## Product contract addendum

- The [packet contract](../contract.md) keeps native schema version 2 and UTF-16
  offsets, migrates version 1, and bounds accepted migrated exports to 5 MiB.
  Exact-source SHA-256 binds supplied bytes, not truth. NFC hashes aid comparison
  without changing stored text or reanchoring stale reviews. Quote selectors keep
  up to 32 code points of context; position selectors count code points. Missing
  original selectors in legacy stale history remain unavailable.
- The published JSON Schema 2020-12 validator is precompiled at build time and
  paired with semantic checks for hashes, references, uniqueness and spans.
  Browser validation needs no runtime code generation. W3C export includes all
  history or visibly fails when original selectors are unavailable; native export
  retains that history. Arbitrary third-party interoperability is unverified.
- [Trace adapters](../adapters.md) accept explicit supported shapes, assign
  deterministic positional IDs and reject unsupported input atomically rather
  than guessing citations. Merge requires matching source/claim populations,
  rejects conflicting review IDs and appends novel right-hand history after the
  left. Latest ratings follow append order, with self-reported reviewer labels.
- Cohen kappa uses exactly two reviewer labels and complete pairs. Fleiss kappa
  uses complete items for a fixed reviewer population. Nominal Krippendorff alpha
  uses items with at least two ratings and weighted coincidences. Undefined
  coefficients are null; missing ratings and excluded stale records stay explicit.
- AIS/ALCE exports are analysis-label interchange, with native scorer compatibility
  unverified. Interpretability stays null. Current supported reviews map to
  attributable; other current verdicts map to not_attributable. Stale attribution
  stays null.
- Packet drafts are opt-in and off on each page load, with explicit restore and
  guarded storage access. Appearance preferences are separate. Unavailable
  storage leaves review and export usable; only native export clears the unsaved
  guard.
