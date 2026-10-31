# Offline validation

## Focused invariants

Command: `npx vitest run benchmarks/invariants.test.mjs`. This run selected the same file through
`npm run test --` with a native-loader configuration and disabled caches. Output: `Test Files 1 passed
(1)` and `Tests 3 passed (3)`.

The tests check rejection of swapped, changed, or missing stress answer keys; counting failed UI
saves; and detection of perturbed span, stale-detection, and tamper-rejection counts. They exercise
the benchmark guard logic, not the full benchmark or its recorded timings.

## Schema validation

Command: `npm run validate:schema`. Output: `valid input and migrated export` for each of
`examples/packet.json`, `examples/reviewed.json`, `examples/acceptance.json`, and
`examples/acceptance-reviewed.json`. All 4 examples passed. The script validates input JSON, parses
and migrates each packet, validates the migrated export, and parses that export again.

## Not checked

The commands above do not measure semantic accuracy, annotator agreement, or manual screen-reader
use. This run produced no results for those checks. Historical benchmark measurements remain in
[results.md](results.md).

## Network fetch

Command: `python benchmarks/fetch.py`. It needs network access and was not run. There is no fetch
output from this run; the focused checks used local files.
