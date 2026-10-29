# Audit verification

## Fresh redesign baseline, October 13, 2026

Source baseline 5e05d871a8d17ff00a90f3af008e8a5e8e4f2c10 on freshly fetched main. Before changes: npm ci succeeded, npm run check exited 0: 96 tests in 11 files, lint/types/build passed. npm audit initially reported 5 dev findings (2 moderate, 3 high). Browser prechange full baseline was not rerun; the repository had 63 cases by inspection, not a newly observed 63-pass result. Added tests first failed for absent studio modules and absent theme state, then passed after implementation.

| October 8 hypothesis | Fresh status | Evidence at baseline/current owner |
| --- | --- | --- |
| Created October 4 in one AI-assisted session | Partially confirmed | API created_at2026-10-04T16:52:08Z; provenance docs disclose AI-assisted examples. Single-session authorship cannot be established from Git alone. |
| Zero stars/single contributor | Partially confirmed | Current API 0 stars; contributors are alawein and dependabot[bot], so one human account plus a bot, not one total contributor. |
| Squash-merged history | Confirmed for named release path | main merge commits/PR links in docs/recent-history.json; no blanket claim about inaccessible/deleted branches. |
| CodeRabbit only reviewer | Partially confirmed | PR3 reviews empty and CodeRabbit status pending. Bot presence does not prove independent completed review. All repository-wide historical reviewers not exhaustively inferred. |
| No npm/PyPI releases | Partially confirmed | GitHub v0.2/v0.3.0/v0.3.1/v0.3.2 releases exist; prior npm attempts failed. Current npm registry readback recorded separately; PyPI is not this TypeScript distribution target. |
| First-release PR3 merged with one check not passing | Partially confirmed | Exact head 6b2e18faa76b50428f5a3a20b3e81c8080c2f179 merged 2026-10-04T17:24:04Z; returned check-runs SUCCESS, CodeRabbit StatusContext PENDING. No failing required build proved. |
| Dependabot/alerts off October 6 | Current disabled state confirmed; exact historical transition partial | Fresh API explicitly alerts disabled, security fixes false and security updates disabled; no settings mutation. October 6 timing remains prior dated evidence. |
| UTF16 conflicts with W3C | Refuted as a current defect | src/spans.ts:31 and 44 convert both directions; annotation.ts:45 exports stored code-point/quote selectors. Native UTF16 remains deliberate compatibility. |
| No NFC policy | Refuted as current | packet.ts:244 computes separate NFC hash; reviews.ts:10 labels normalization-only stale without reanchoring. |
| No published packet schema | Refuted as current | schema/claim-review-packet.v1.json; scripts/generate-validator.mjs precompiles AJV2020; packet.ts invokes it for actual browser imports before semantic checks. |
| Tab closure loses work | Partially confirmed | draft.ts:3/12/19 guarded opt-in draft operations; app.ts beforeunload/export guard. Off-default/no export or crash without saved draft still loses memory state. |
| Reviewer identity self-reported | Confirmed by design | packet.ts:120 requires self-reported; no credential or human independence claim. |
| Unsafe DOM/absent CSP | Refuted as current | app.ts:58/94/116 textContent, no innerHTML sinks; build.mjs:19 hash-authorized CSP/default-src none, now explicit connect-src none. Active text browser tests retained. |
| No Unicode properties | Refuted as current | unicode.test.ts:26-30 exercises both conversions, fast-check randomized text and normalization. |

Historical sections below refer to their stated revisions/dates. They are retained as evidence, not repeated work or current completion claims.

## Current state, October 8, 2026 closeout

v0.3.0 was merged by [PR19](https://github.com/alawein/siftgrain-cite/pull/19) at
commit `876d78580bca07c3ab7f7ae7c6530db9bd1d9b69` and has an immutable
[tag](https://github.com/alawein/siftgrain-cite/tree/v0.3.0) and
[GitHub Release](https://github.com/alawein/siftgrain-cite/releases/tag/v0.3.0).
The [publish workflow](https://github.com/alawein/siftgrain-cite/actions/runs/37799350424)
failed with `ENEEDAUTH`. npm readback returned 404 for claim-review@0.3.0;
successful registry publication is not established. Its locally built GitHub
assets do not establish hosted provenance. Existing assets/tags are preserved.

The owner authorized the remaining compatible closeout and publication scope,
excluding the entire Dependabot family; credentials remain owner-entered.
v0.3.1 is tagged and its canonical hosted assets are published on GitHub; npm failed with EALLOWGIT in run 37826160022.

v0.3.2 is tagged at `6759ad71231f2e1b59ed8b5913ffad6dfd547970` and its
[GitHub Release](https://github.com/alawein/siftgrain-cite/releases/tag/v0.3.2)
is public. [Canonical run 37828847596](https://github.com/alawein/siftgrain-cite/actions/runs/37828847596)
passed 96 unit tests, 10 Python tests, 48 browser cases, build and hosted
provenance checks. Its corrected absolute tarball path reached npm authentication
and failed with `ENEEDAUTH`; npm publication remains unverified.
[Pages run 37828847613](https://github.com/alawein/siftgrain-cite/actions/runs/37828847613)
succeeded at that revision. Owner CLI authentication remains blocked with E401
pending human web login/OTP and trusted publisher setup.

New local checks belong to this
closeout; the Phase 0 and prepublication results below are dated historical
evidence, not current publication state or fresh test results.

Audit input: compass artifact dated October 8, 2026. This record checks its
claim-review hypotheses against a fresh clone, not adoption or semantic accuracy.

## Phase 0 baseline (historical, before publication)

- Clone HEAD: e9c96dee96edc91e3bf1844067cae71168ce74bb.
- Node v22.23.2; Python 3.14.7; package version 0.2.0; private true.
- npm lockfile present (v3), SHA-256 f558a0f495dfd5bcb361ea4d68c4bd13377e72bd418f07eaf4d2686026d64a5f.
- npm ci: 135 packages installed, 0 reported vulnerabilities. npm blocked esbuild's
  install script; build outcome is checked independently.
- Baseline check: lint, TypeScript, 43/43 unit tests and build passed. Browser attempt: 24 passed, one Firefox timeout, eight unrun; details below.

## Hypotheses at the clone SHA

| Hypothesis | Status | Source evidence |
| --- | --- | --- |
| Browser performs no source fetch, upload, model or telemetry | Confirmed within inspected runtime | src/app.ts:1-7 uses static imports; app.ts:139,203 parse explicit text. No fetch/XHR/WebSocket/EventSource/sendBeacon/dynamic import matches in src. |
| DOM input is interpreted as text | Confirmed within inspected sinks | app.ts:42,78,95,111,113 use textContent; app.ts:38 uses Option; app.ts:221 assigns a generated blob URL, not user URL. No HTML sinks found. |
| Strict CSP is present | Refuted | src/shell.html:3-12 contains metadata but no CSP; scripts/build.mjs:16-18 injects inline style/script without hashes. |
| Positions follow W3C code points | Refuted | spans.ts:1-16 uses string.length and UTF-16 charCodeAt; shell.html:79 labels code units. It correctly refuses surrogate splits. |
| CRLF selection maps to original source | Confirmed by code and baseline browser tests | spans.ts:19-30 maps textarea LF indices; app.ts:179-180 applies it before saving. |
| Normalization-only edits can be distinguished | Refuted | hash.ts:3 hashes exact UTF-8; packet.ts:171 checks exact hash; reviews.ts:4 compares raw hashes only. No NFC hash or normalization policy. |
| Versioned JSON Schema is published | Refuted | No schema directory/file; packet.ts:155-204 is handwritten runtime validator. |
| Closing without export can lose work | Confirmed | app.ts:69-71 tracks dirty packet; app.ts:232-234 guards beforeunload; no browser storage API matches. Crash protection absent. |
| Reviewer identity is authenticated | Refuted as a product claim; candid disclosure confirmed | packet.ts:24 records arbitrary reviewer string; README explicitly calls it self-reported. |
| Property-based Unicode coverage exists | Refuted | packet.test.ts contains examples only; package.json has no property testing dependency. |
| History is append-only in review operation | Confirmed within product operation | reviews.ts:15-30 rejects duplicate IDs/stale appends and returns a new array; arbitrary imported history cannot prove authorship. |
| Live Pages equals release | Partially confirmed; live output unverified | Local source/build cannot establish live deployment equality. No deployment is authorized. |
| Research validity/adoption proven | Refuted as an assertion | Synthetic examples and candid README disclaimers do not establish annotator agreement, accuracy or adoption. |
| PR3's odd check establishes a product defect | Partially confirmed | Root checks historical Actions separately; a check count alone cannot identify cause. |

## Verification limits

No external annotations, identity authentication, production adoption or semantic
entailment is established. Source rights, authentic observations and human
judgments remain outside hash integrity. Remote history and security-settings
readback are owned by the coordinating agent's reports.

Baseline completion: npm run check exited 0 (43/43 unit tests, lint, TypeScript,
build). Browser attempt: 24 passed; Firefox large valid packet exports within
import byte bound timed out after 1.0 minute and worker teardown stalled. Task
interrupted boundedly; 8 tests unrun, exit 1. Chromium and WebKit each passed all
11 workflows, including standalone HTTP/HTTPS-blocked file operation. This is a
partial browser baseline, not a clean 33/33 pass. Fresh final verification will
revisit the Firefox failure.

Historical PR3 readback by coordinating agent: 31 Actions checks SUCCESS; the
remaining CodeRabbit StatusContext was PENDING. The audit's odd check count does
not establish a failing product test. [PR3 checks](https://github.com/alawein/siftgrain-cite/pull/3/checks).

## v0.3.0 verified implementation

Fresh commands in this checkout on October 8, 2026:

- npm run check: exit 0; lint, TypeScript, 72/72 unit tests and single-HTML build.
- npm run validate:schema: exit 0; both packet fixtures accepted as legacy inputs
  and canonical migrated exports. Unit cases reject eleven malformed classes via
  both runtime parsing and the combined structural/semantic path.
- npm run test:browser: exit 0; 48/48 cases, 16 per Chromium, Firefox and WebKit.
  Each engine completes standalone import/review/export/reimport with HTTP and
  HTTPS blocked, strict CSP, inert script/event-handler/javascript-URL text,
  JSON-LD export, opt-in drafts, unavailable/quota-blocked storage, corrupt-draft
  preservation and retained close guard. Default startup/import/save performs
  zero localStorage getter accesses before opt-in.
- Random Unicode seed 20261008: 300 span/conversion trials and 100 hash/export/
  reimport trials passed. Literal W3C quote/alphabet-position examples passed.
- git diff --check: exit 0. No remote publication, deployment or settings mutation
  was performed by this implementer.

Final Firefox large-packet case took 39.2 seconds; draft save/restore case took
43.2 seconds with three workers and a 60-second workflow bound. Earlier runs took
19.6-26.4 seconds for the large case and 11 seconds for isolated draft operation.
These are automation/startup timings on this machine, not latency guarantees.
No retries hide failures. The initial timeout and intermediate CSP test failures
remain reported above; final policy was retained and all assertions passed.

### Final v0.3.0 source audit (historical, before publication)

| Area | Verified implementation |
| --- | --- |
| Runtime network/dynamic imports | No fetch, XHR, WebSocket, EventSource, sendBeacon or dynamic import in product source. src/app.ts:1-8 imports static bundled modules; context URL in annotation.ts:10 is data, never retrieved. |
| DOM sinks | app.ts:48,84,101,117,119 use textContent; textarea/input values are literal. No innerHTML, outerHTML or insertAdjacentHTML in runtime. app.ts:227 creates a generated blob download URL. |
| CSP | shell.html:5 placeholder is replaced by scripts/build.mjs:15-18 with default-src none plus exact script/style hashes. No connect-src directive or unsafe-inline. |
| Offsets | spans.ts:19 handles original CRLF mapping; spans.ts:31,44 convert UTF-16/code-point positions; spans.ts:62 builds exact selectors with 32-code-point context. Surrogate splits fail. |
| Normalization and migration | packet.ts:244 computes a separate NFC hash; original source text/raw SHA stay unchanged. packet.ts:183 enriches available legacy history; reviews.ts:10 exposes normalization-only stale without reanchoring. |
| Native integrity | packet.ts:196 checks current selectors/hash/offsets; packet.ts:276-284 incrementally bounds canonical history bytes. Schema structure is paired with these semantic checks; schema alone is insufficient. |
| Storage | draft.ts:3-24 puts every getter/setItem/getItem/removeItem inside try/catch. app.ts:35 sets the opt-in control false; app.ts:143 persists only while checked. Restore/clear are explicit actions. |
| W3C scope | annotation.ts:4 exports plain-text review annotations to original raw-hash URNs. Missing migrated stale selectors produce an explicit error and retain native export. External consumer interoperability remains unverified. |

Research remains a proposed protocol in docs/study-protocol.md, not measured
annotations. Current publication/security preparation is documented by the
coordinator in RELEASE_READY.md and SECURITY_SETTINGS.md. A clean-clone recheck
and final review belong to the coordinator before push/draft PR.

## Shared hardening and publication gates (historical, October 8 before PR19 merged)

| Recommendation | Status | Evidence or remaining scope |
| --- | --- | --- |
| Pinned Actions | Done | Every `uses:` in `.github/workflows` has a full commit SHA; local actionlint checks passed. |
| Dependency auditing | Done | CI reports audits with `continue-on-error`; it does not silently assert a clean audit. |
| Release workflows | Prepared, blocked by owner gates | `release.yml` fires only on tags, uses trusted publishing/provenance and checks version plus main ancestry. No tag or publication was executed. |
| Security settings | Prepared, blocked by owner gate | Exact settings paths and version-update configuration are in `SECURITY_SETTINGS.md`. No settings changed. |
| Pages | Prepared, blocked by owner gate | Existing Pages workflow is manual-only. Merge no longer deploys automatically. |
| README/changelog/contract | Done | Version 0.3.0 and candid scope documented; primary related-work sources opened and checked before citation. |
| Merge/tag/release/publish | Prepared, blocked by owner gates | `RELEASE_READY.md` includes commands and registry setup, and `RELEASE_NOTES.md` is ready for the release gate. |
| Final independent review | Done | Independent review found two eval adapter defects; both reproduced, regression-tested and independently rechecked after fixes. No remaining review findings. |
| Final clean-clone verification | Done | Fresh installs, full suites, lint/types, schemas and artifacts passed; exact coordinator evidence below. |
| Push and one draft PR | Done | [Draft PR #19](https://github.com/alawein/siftgrain-cite/pull/19) opened on the authorized branch; no merge/main/tag/deploy/settings change. |

### Study status

Done: `docs/study-protocol.md` specifies an AIS-style independent annotation
study, agreement analysis and comparison with ALCE automatic citation metrics.
No human annotations, agreement scores or quality measurements were fabricated.
Legacy stale reviews without the original source retain native history but
cannot reconstruct unavailable selectors; JSON-LD export reports that limitation.

### Coordinator final verification

Coordinator clean clone at c167f48 (then documentation fast-forward 3f43a86):
fresh npm ci installed 141 packages; npm run check passed lint, TypeScript,
72 unit tests and standalone build. Both example inputs/migrated exports pass
schema validation. npm pack --dry-run contains 6 files and npm audit --omit=dev
reports 0 vulnerabilities. All 48 browser cases passed in 37.5 seconds across the
three engines. Documentation fast-forward passed lint and stayed clean.

All repository workflows pass local actionlint, and Markdown lint passes.
Remote main remained at the Phase 0 commit before branch publication.
Independent review findings were resolved and rechecked. No merging, tagging,
registry publication, release creation, deployment or settings mutation occurred.

Hosted initial link check failed on the two references to the authenticated
maintainer settings page, each returning 404 to anonymous lychee. Only the exact
settings URL is excluded in .lycheeignore; public citations remain checked.
The remote checks are rerun after this documented correction.

## CodeRabbit import-extension disposition, October 8, 2026

CodeRabbit's formal review of `26321f8` raised one trivial nitpick at
`src/interoperability.test.ts:5-8`, asserting that NodeNext requires explicit
`.js` extensions. The premise is refuted by `tsconfig.json:4-5`: this repository
uses `module: ESNext` and `moduleResolution: Bundler`, not NodeNext. Those
extensionless imports follow the existing runtime/test convention. The exact
`7e508d8` fresh-checkout TypeScript check and all 94 unit tests passed. No import
or compiler change is warranted; this disposition changes documentation only.

## npm 12.2.0 parser regression tooling, October 8, 2026

npm 12.2.0 is our chosen tested production pin, now also an exact dev dependency
for the real CLI regression. It is excluded from the six-file distribution and
has no runtime dependencies in the product. The fixture uses empty user/global
configs and an offline dry run; it neither authenticates nor publishes.

Report-only `npm audit` identifies five vulnerable packages within npm's bundled
`node_modules/npm/node_modules/`: brace-expansion (high), http-cache-semantics
(high), ip-address (moderate), postcss-selector-parser (moderate), undici (high).
Audit reports `fixAvailable: true` for all five; no bundled dependency override,
forced upgrade or lockfile relaxation was applied. `npm audit --omit=dev` reports
zero vulnerabilities. Tooling findings do not enter the offline HTML or shipped
package. HTTP/cache code can be used by npm's actual registry operations; the
offline test does not establish that every tooling advisory is unreachable.

Advisories: brace-expansion
[GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr),
[GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7),
[GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p);
http-cache-semantics
[GHSA-ch52-4w7c-c8xp](https://github.com/advisories/GHSA-ch52-4w7c-c8xp);
ip-address
[GHSA-rpw4-54j3-4h4q](https://github.com/advisories/GHSA-rpw4-54j3-4h4q),
[GHSA-2vr4-cq9g-pvrc](https://github.com/advisories/GHSA-2vr4-cq9g-pvrc),
[GHSA-j6r3-76f7-8jcv](https://github.com/advisories/GHSA-j6r3-76f7-8jcv),
[GHSA-h3mg-xc3c-68pw](https://github.com/advisories/GHSA-h3mg-xc3c-68pw);
postcss-selector-parser
[GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf);
undici
[GHSA-3wwx-pv8p-q78v](https://github.com/advisories/GHSA-3wwx-pv8p-q78v),
[GHSA-r53p-7pc4-xj5r](https://github.com/advisories/GHSA-r53p-7pc4-xj5r),
[GHSA-rfgv-xxqx-mfg5](https://github.com/advisories/GHSA-rfgv-xxqx-mfg5).

## Redesign verification binding

Source 700e91b:108 unit tests in 15 files,96 hosted cross-engine browser cases and all required CI/LHCI checks succeeded. Fresh Windows clone 7bf3870: npm ci,107 unit/96 browser, schemas, token contrast, benchmark,10 study tests, native Croissant and 3 Lighthouse runs passed. See RESULTS.md for exact source/run URLs, bounded diagnostics, platform failures repaired, reproducible archive hash and candid partial requirements. No independent human study, field INP, registry publication or repository transfer is inferred.

Stale-animation follow-up: independent review found first-frame contrast 3.9677 dark/2.9364 light at textopacity 0.45. Both unit cases and all 6 paused browser cases failed on the previous style. Transform-only stale arrival removes text fading;110 unit tests and explicit paused-frame axe/contrast regressions replace reduced-motion-only confidence. Exact final head/checks are recorded in PR24.

## Final benchmark review fixes

Actual CodeRabbit review identified mispaired stress keys and successful exits after failed UI saves. New regressions failed before the helpers existed; valid keys now require matching IDs and exact quotes before scoring, and UI save errors cause a nonzero exit after preserving the report. A Chromium workflow regression observed a second completion celebration after a saved revision; the corrected queue transition celebrates once. Repeated completed saves remain test-covered across all three engines.

The coordinator also disabled unused persisted checkout credentials in the two development jobs and normalized new relative imports to .js. Shader compilation remains bounded to explicit viewer changes/completion and disposes programs and shaders after the finite draw; reuse is an optional optimization, without a demonstrated correctness or budget failure. Test assertions intentionally fail if required CSS/schema invariants disappear; they were not weakened. Browser computed colors are canonical RGB values observed across all three engines, so a speculative named-color parser change was omitted.
