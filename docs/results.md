# Results, October 13, 2026

Baseline source 5e05d87:96 tests in 11 files; npm check passed before edits. Implementation source 700e91b:108 unit tests in 15 files and 96 browser cases passed in fresh hosted CI. Windows fresh clone 7bf3870 passed 107 unit tests,96 browser cases, schema/tokens/bench/study/native Croissant and 3 LHCI runs. Final PR checks bind any later documentation-only head.

## Integrity task

Reproduce: `python benchmarks/fetch.py`, then `make bench` (or `npm run bench`). Raw measured snapshot: benchmarks/results.snapshot.json. Node22.23.2, Windows11 build26300, AMD Ryzen7 8845HS with Radeon780M. RSS is whole runner process, not isolated core peak memory.

Core span conversions:8/8; naive code-point-as-UTF16 baseline 6/8. Changed-source detection8/8; tampered-hash rejection8/8. Normalization-only cases3/3, with reviews remaining stale. Dev/test each4 cases. Thirty repetitions per split: dev p503.68 ms, p959.76 ms; test p503.96 ms, p959.10 ms. Whole-process RSS46,948,352 bytes.

External ALCE: dev9claims/14citation items, test4claims/6items. All 20 original supplied numeric attribution labels are retained separately from review inputs. Source hashes/schema/migration are validated. Semantic accuracy is null: the tool does not predict attribution. This is external gold preservation plus an integrity benchmark, not a new model or human semantic evaluation. Original source-page revision lineage and compound screening remain incomplete.

## Scripted UI task

Four real offline workflows per vibe,16 scripted saves total,0 save-status errors. Supplied rationale explicitly says synthetic scripted task. Throughput is automation speed, not human review productivity.

| Vibe | Local file LCP ms | Max observed event ms | Scripted reviews/min | Post-workflow mean RAF fps | Frame p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| cartoon | 1096 | 88 | 276.4 | 60.00 | 16.80 |
| calm | 160 | 56 | 200.6 | 60.00 | 16.80 |
| pixel | 144 | 96 | 201.1 | 60.00 | 16.80 |
| lab | 156 | 56 | 211.2 | 60.00 | 16.80 |

RAF cadence is a 1.5-second window after scripted saves, not frame timing during each interaction. This workstation is identified; no generic midrange-laptop60 fps certification is claimed. Max event duration is a laboratory observation, not field INP. INP remains unavailable. Small deterministic stress suites do not justify population confidence intervals; timing quantiles describe observed repetitions only. The existing human-study protocol defines cluster bootstrap intervals when actual labels exist; none were fabricated.

## Lighthouse CI

Three loopback desktop Lighthouse runs after removing synchronous first-paint WebGL setup. All configured assertions passed. This checks local HTTP, separately from Playwright file-URL LCP.

| Run | Performance | Accessibility | LCP ms | TBT ms |
| --- | ---: | ---: | ---: | ---: |
| 1 | 0.75 | 1.00 | 461.0 | 656.0 |
| 2 | 1.00 | 1.00 | 431.4 | 0.0 |
| 3 | 1.00 | 1.00 | 442.2 | 23.5 |

The first implementation failed TBT200 ms with 375-704 ms because WebGL initialized before interaction. The bounded fix keeps a static CSS hero first and initializes WebGL on viewer interaction/completion. Later changes require fresh checks; the snapshot is dated evidence, not a perpetual guarantee.

## Limits and audits

No independent human collection, adoption, production ownership, semantic accuracy or model-as-judge result. ALCE model execution is omitted; original labels/scores are provenance, not our baseline judge. Human consent/independence follow studies/ais-pilot/README.md. Dataset ZIP remains local, not published to HF or a new release.

Before adding dev-only axe/LHCI, npm audit reported 5 findings (2 moderate, 3 high). The expanded dev graph reported 22 (2 low, 6 moderate,14 high) on installation; current report-only audit is the authoritative latest snapshot. Production dependency audit has no runtime dependencies. No automatic dependency fix or Dependabot changes were applied. Audit success/failure alone is not a security guarantee.

Schema integration caught a Node-ESM Unicode helper require; explicit ESM generation repaired it. A concurrent UI/browser run also hit Windows Firefox software-compositor teardown failures; the complete single-worker96-case run passed without retries. Software WebGL contexts with major performance caveats now use static fallback. Dataset text writes explicitly use LF after the initial hosted Croissant hash check exposed Windows newline differences. No failing check was bypassed.

## Verification binding

Implementation head `700e91b4912bbe297ff5d6e1b98ed7555b6dff26`: [CI run 38382973636](https://github.com/alawein/siftgrain-cite/actions/runs/38382973636) and [Browser workflows run 38382972867](https://github.com/alawein/siftgrain-cite/actions/runs/38382972867) succeeded. Browser workflow executes 96 cases across 3 engines, token/bundle gates and 3 Lighthouse runs with the runner system Chrome version recorded in its log. CodeRabbit reports a green status but explicitly skipped this draft; it is not completed independent review.

Local clean clone was created with --no-local at 7bf3870 and a fresh npm ci:107 unit tests,96 browser cases,4 example+2 external packet validations, 1 token contrast/generated-byte test,10 study tests, native Croissant parse, benchmark and 3 LHCI runs passed. Source 700e91b adds the bounded-schema-diagnostics regression (108 tests) and sandboxed system Chrome CI selection. The malformed100-record case generated902diagnostics before short-circuit validation; the new test bounds diagnostics to 8 or fewer.

Measurement tables and 4 GIFs are recorded from 7bf3870 UI behavior. They are dated laboratory evidence, not a claim that every later source head has identical timings. Final 700e91b hosted LCP/TBT/accessibility/bundle assertions passed. A transient concurrent-run 2120 ms event maximum was observed before rejecting software WebGL major-performance-caveat contexts and isolating verification; it is not omitted as field INP evidence.

The deterministic dataset ZIP recreated in the working checkout and clean clone has identical SHA256 `5d91ac6b2b47b7ac988a82049f4edff7b4591d2f2aa694422b9dcbec3aee2130`. Its checksums.json verifies15 payload files, including split/answer-key data, cards, license and schemas, and is itself included as the16thentry. No archive upload occurred.

## Stale-motion contrast follow-up

Independent review identified that the first stale-animation frame faded text to opacity 0.45. Real canonical compositing gave contrast 3.9677:1 in dark and 2.9364:1 in light, below 4.5:1. Two node tests failed before the fix. Six browser cases (both appearances in all 3 engines) also failed on the prior built HTML while the actual CSS animation was paused at currentTime 0, observing opacity 0.45. This was a product defect despite reduced-motion axe checks passing.

The fix removes both text-opacity keyframes and retains only translation plus the dashed stale border. The suite now has 110 unit tests in 16 files. New browser regressions pause the actual stale state at frame 0, assert full text opacity and calculated AA contrast, and run axe while still paused. No delay or reduced-motion override conceals the initial frame. Final source-head results belong to PR24 checks.

## Final review verification

The corrected working tree passed 112 unit tests in 16 files, lint/types/build, and the checksum-pinned benchmark (8/8 stress conversions, stale detection and tamper rejection; 20 supplied ALCE labels preserved). The full browser attempt passed 103 cases and reported two Firefox browser-context teardown protocol errors. Both failed cases then passed unchanged in an isolated two-case run; this is reported separately from a single 105-case pass. Hosted checks on the final PR head are authoritative for delivery.

An updated scripted UI measurement completed 16 saves with zero errors. Local-file LCP was 92-156 ms, maximum observed event duration 48-56 ms, and post-workflow frame p95 16.7-16.8 ms. These remain workstation laboratory observations, not field INP or human throughput. Updated gzip size is 38,405 bytes against the unchanged 80,000-byte budget.

Fresh temporary clone `ab351f607d6628b1ce9da9bf7b4f299dad89390e` passed npm ci, 112 unit tests in 16 files, lint/types/build, schema validation of all four examples, the full benchmark and generated token/AA checks. The exact source also passed [hosted CI](https://github.com/alawein/siftgrain-cite/actions/runs/38391466493) and [all browser/Lighthouse checks](https://github.com/alawein/siftgrain-cite/actions/runs/38391465821). Independent bounded review of caa3da9..ab351f6 found no actionable defects. Later documentation-only heads preserve the verified runtime source; final PR24 checks remain authoritative.
