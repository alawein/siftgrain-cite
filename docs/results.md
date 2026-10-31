# Historical benchmark results

These measurements come from `benchmarks/results.snapshot.json`, whose integrity access date is
2026-10-13. They describe an earlier build, not the current source. The focused checks in
[validation.md](validation.md) do not refresh these measurements.

## Integrity task

The recorded environment was Node v22.23.2 on Windows 10.0.26300, with an AMD Ryzen 7 8845HS with
Radeon 780M Graphics. Recorded memory was 46,948,352 bytes for the whole runner process, not an
isolated core peak.

| Split | Cases | Correct spans | Naive code-point-as-UTF16 correct | Stale detected | Normalization-only detected | Tampering rejected | Repetitions | p50 ms | p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| dev | 4 | 4 | 3 | 4 | 1 | 4 | 30 | 3.68 | 9.76 |
| test | 4 | 4 | 3 | 4 | 2 | 4 | 30 | 3.96 | 9.10 |

The public stress fixtures and paired answer keys are under `benchmarks/v1/`, with hashes in
`benchmarks/checksums.v1.json` and dataset metadata in `benchmarks/croissant.json`. Synthetic integrity
gold is not attribution truth. Timing quantiles describe the recorded repetitions, not population
confidence intervals.

| External split | Claims | Sources | Supplied gold items | Labels preserved | Semantic accuracy |
| --- | ---: | ---: | ---: | ---: | --- |
| dev | 9 | 14 | 14 | 14 | null |
| test | 4 | 6 | 6 | 6 | null |

The external labels were preserved, not predicted. The snapshot records no model or human judge run.

## Scripted UI task

These historical measurements use the earlier build with multiple looks. The labels below identify
the measured variants. Only Calm remains available in the current app.

The snapshot records Playwright Chromium on the workstation above. Each row records 4 scripted
reviews and 0 errors. Automation speed does not measure human review productivity.

| Historical variant | Local file LCP ms | Max observed event ms | Scripted reviews/min | Mean RAF fps | Frame p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| cartoon | 1096 | 88 | 276.4 | 60.00 | 16.80 |
| calm | 160 | 56 | 200.6 | 60.00 | 16.80 |
| pixel | 144 | 96 | 201.1 | 60.00 | 16.80 |
| lab | 156 | 56 | 211.2 | 60.00 | 16.80 |

RAF cadence is a workstation observation, not a laptop performance certification. Local-file LCP
may be unavailable. The maximum event duration is a laboratory observation; the snapshot's INP
values are null because the short scripted sessions do not measure field INP.

## Lighthouse measurements

The snapshot contains these runs in order. Scores and timings do not establish current accessibility
or manual screen-reader usability.

| Run | Performance | Accessibility | LCP ms | TBT ms |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0.75 | 1.00 | 461.0 | 656.0 |
| 2 | 1.00 | 1.00 | 431.4 | 0.0 |
| 3 | 1.00 | 1.00 | 442.2 | 23.5 |
