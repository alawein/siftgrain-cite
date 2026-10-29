# v0.3.0 decisions

## v0.3.1 closeout, October 8, 2026

- Continue the authorized compatible closeout from merged main, preserving the
  previous feature branch and immutable v0.3.0 release. No runtime schema change.
- Test the specific `jsonld` 9.0.0 consumer with pinned local W3C context; do not
  claim universal interoperability or change unchanged product storage/UI paths.
- Use eight sorted ALCE ASQA answers with original supplied citation passages and
  scores for an AIS-rubric pilot. Original AIS labels are unavailable and remain
  null. Manual compound screening and independent collection remain pending.
- Separate canonical build, OIDC publication and GitHub upload jobs. Retain build
  assets before publication; GitHub upload can complete after npm failure. Existing
  version/asset mismatches fail, without clobber or blind republishing.
- Preserve the observed v0.3.0 npm `ENEEDAUTH` failure and 404 registry readback;
  registry bootstrap is an access matter handled by the coordinator/owner.
- The owner excluded every Dependabot feature, while existing report-only npm
  audits and non-Dependabot controls remain supported.
- Bound unit workers to three after the new tar/JSON-LD suites reproduced a
  five-second Unicode property-test timeout under concurrent Windows work.
  Preserve all seeds, run counts and integrity assertions; these are correctness
  tests, not five-second performance benchmarks. Browser driver/framebuffer
  failures are reported separately and do not justify product changes.
- The clean clone passed Chromium/Firefox completely and 15 of 16 WebKit tests.
  The large-packet readiness assertion exhausted its default five-second wait;
  a bounded probe completed the entire unchanged import/export/reimport in
  9.5 seconds with a 20-second readiness wait. Apply that wait only to this
  test's two import assertions. Keep all integrity assertions, the 60-second
  test limit, three engines and browser driver settings unchanged.

## Original v0.3.0 implementation decisions (historical)

The owner requested autonomous continuous implementation with reversible
ambiguities recorded here. No design approval wait is required for this named
scope. The finished tool remains an explicit-input, deterministic browser-only
single HTML artifact with self-reported judgments and MIT disclaimers.

1. Keep native UTF-16 offsets for textarea selection and v0.2 loading. Introduce
   schema_version 2 for enriched native exports; v0.2 schema_version 1 migrates.
2. Preserve exact-source SHA-256 and add NFC SHA-256 as a comparison aid. Never
   normalize stored source or silently move a judgment to different bytes.
3. Each current judgment records an exact TextQuoteSelector with up to 32 code
   points of prefix/suffix plus code-point TextPositionSelector. Migrated stale
   v0.2 history has unavailable selectors because the original passage is absent;
   its integrity limitation stays explicit rather than fabricated.
4. JSON Schema 2020-12 describes structural constraints. Dev validation pairs it
   with the runtime validator for hashes, references, uniqueness and spans that
   standard JSON Schema cannot express. Equivalence tests exercise both paths.
5. Web Annotation JSON-LD exports review annotations only, with local URNs for
   supplied source identity and textual judgment bodies. It is an export adapter,
   not a promise of arbitrary W3C import or third-party interoperability.
6. Draft persistence is opt-in and off on every new page. Explicit restore is
   separate from enabling saves. Every storage access is guarded; unavailable
   storage leaves review and export usable. The unsaved-close guard remains.
7. Build hashes inline CSS/classic script into a default-src none CSP. No
   connect-src directive, runtime dependencies or network requests are added.
8. Implement selectors/hash migration and negative tests, schema/export tests,
   storage/CSP browser behavior, then full checks and documentation. Root owns
   shared workflows, security readback, release preparation, push and draft PR.

The W3C normative [annotation model](https://www.w3.org/TR/annotation-model/#text-quote-selector)
requires Unicode code point positions. Grapheme boundaries are a SHOULD;
code point boundaries preserve compatibility with existing explicit offsets.
Plain text does not undergo HTML stripping or whitespace normalization here.

1. Enriched legacy packets can become larger because exact quotes are added. Reject
   migration incrementally when its canonical export would exceed 5 MiB, so an
   accepted packet remains resumable. No original history is silently dropped.
2. W3C export is all-history or a visible error if a migrated stale review lacks
    original selectors; native export remains available. This avoids inventing a
    passage or silently omitting judgments.
3. Strict CSP blocks the old doubled-text test's new inline style. Tests alter
    the allowed existing stylesheet through CSSOM to exercise layout; no policy
    exception is introduced. Firefox's baseline large-packet timeout did not
    reproduce in isolated or full subsequent runs; keep this timing fact candid.

4. Bound browser workers to three and allow 60 seconds per workflow. Firefox's
    draft case passed in 11 seconds isolated but timed out at 32.7 seconds with
    six concurrent workers; large-packet cases took 19.6-26.4 seconds. Reduce
    resource contention and keep a finite limit rather than adding retries or
    weakening any assertions. Startup/automation timing is not app latency.

## Release coordination decisions

Hosted link checks returned 404 only for the repository's maintainer-only security
settings URL. Keep its exact click path, exclude only that anchored URL from
anonymous lychee probes, and continue checking all public research/document links.
Read-only API checks separately established the disabled alerts/update settings.
No setting or credential was changed to make the check pass.

Pages deployment is manual-only so approving a merge does not also approve
hosting. A release tag starts trusted package publication, so the tag requires
both tag and registry publication authorization. npm first-publication bootstrap,
if needed, is a separate owner-approved publication using existing access; this
run does not create secrets or bypass registry setup.

## Release results and bootstrap, October 8, 2026

Generate release bodies from validated workflow results instead of static
prepublication notes, and reconcile them after successful asset checks on
retries. Failed publication can occur after registry upload, so report registry
state as unverified rather than absent. Matching assets remain immutable.

Prefer the existing usable immutable v0.3.0 tarball for first-package bootstrap
only after fresh registry E404, checksum and package-version verification. This
avoids repackaging and preserves the maintenance version for OIDC. Manual bootstrap cannot gain
provenance later; that limitation stays explicit. The owner enters web-login
credentials and configures the existing package trusted publisher. The worker
does not publish or enter credentials.

## Correct local npm artifact path and preserve v0.3.1, October 8, 2026

Live run 37826160022 built and distributed v0.3.1 on GitHub but npm 12.2.0
parsed its slash-only tarball argument as GitHub shorthand (EALLOWGIT). Resolve
the production argument to an absolute local path. Pin npm 12.2.0 as dev-only
regression tooling and execute a real offline dry run with empty user/global
configs; mock-only command tests missed the parser behavior. A bounded 60-second
integration timeout covers two npm subprocesses, not product performance.

Use v0.3.2 because the immutable v0.3.1 tag retains its faulty publish script.
Preserve all previous branches, tags and assets. First fully provenanced registry
publication is a future workflow result, not an inference from preparation.
Manual v0.3.0 bootstrap remains conditional on fresh absence and verified bytes;
never manually consume the reserved v0.3.2 version. npm tooling's bundled audit
findings are development-only and report-only; no automatic dependency upgrade.

## Actual v0.3.2 delivery, October 8, 2026

v0.3.2 is tagged at `6759ad71231f2e1b59ed8b5913ffad6dfd547970` and its
[GitHub Release](https://github.com/alawein/siftgrain-cite/releases/tag/v0.3.2)
is public. [Canonical run 37828847596](https://github.com/alawein/siftgrain-cite/actions/runs/37828847596)
passed 96 unit tests, 10 Python tests, 48 browser cases, build and hosted
provenance checks. Its corrected absolute tarball path reached npm authentication
and failed with `ENEEDAUTH`; npm publication remains unverified.
[Pages run 37828847613](https://github.com/alawein/siftgrain-cite/actions/runs/37828847613)
succeeded at that revision. Owner CLI authentication remains blocked with E401
pending human web login/OTP and trusted publisher setup.

Preserve the immutable tag and canonical hosted assets. Successful build and
GitHub/Pages delivery do not establish npm authentication or publication.

## Citation studio redesign

Architectural scope: retain strict native packet core and standalone HTML, extend with small adapters, merge/agreement module and independent viewer preferences. Replacing the core would reopen proven migration/integrity behavior; hosting a service would break offline use. The chosen approach preserves both.

- Native schema version 2 and UTF16 offsets remain unchanged. Version1/v0.2 imports migrate through the existing parser. Hashes bind supplied bytes, never truth.
- Common trace shapes deliberately require string answer/output/response and a document array, including page_content/metadata.title. Unsupported/nested/message-only traces fail atomically rather than guessing citations. Native run IDs are not trusted as review identities; deterministic positional IDs are assigned.
- Merge requires identical source/claim populations, rejects conflicting review IDs and retains histories. Order is left packet history, then novel right packet history. Latest means last appended per claim/source/reviewer, so right-hand novel ratings supersede left-hand ratings for the same self-reported label. No timestamps or independence are inferred. Global queue completion uses the most recently appended rating per pair.
- Cohen uses exactly two reviewer labels and complete pairs. Fleiss uses complete items for a fixed rater population. Nominal Krippendorff alpha uses all items with at least two available labels, weighted coincidence counts. Undefined coefficients are null, missingness and excluded stale records explicit. A valid rating remains available if later stale history appears, with the stale record excluded.
- AIS/ALCE labels are a versioned analysis interchange, not a claim of native scorer compatibility. Interpretability is null because the review form does not collect the AIS first stage. Supported maps to attributable, other verdicts to not_attributable only for current sources. Stale attribution is null. W3C and native exports retain exact proven formats.
- Preference storage contains only appearance/vibe and is try/catch guarded. Packet drafts remain opt-in and off each load. A prepaint hash-authorized script reads preferences; the app script owns packet interaction. Explicit connect-src none documents the existing default-src network denial.
- WebGL2 is a bounded local hero/celebration renderer with static CSS fallback; no WebGPU dependency is justified. No perpetual render loop. Finite celebration and pointer parallax respect pause, hidden state and reduced motion.
- Canonical private design-tokens 1.0.0 is vendored byte-identically into sibling tools. No independently published shared runtime dependency.
- External ALCE gold is checksum-pinned and fetch-only. Local archives preserve source titles and separate supplied labels. Synthetic Unicode correctness is independent of attribution accuracy. No human labels or LLM judge are fabricated.

The published packet schema is precompiled with AJV2020 at development/build time. Its ESM Unicode-length helper is bundled locally; no runtime code generation or CSP exception. Sparse agreement stores only supplied ratings, retaining the full missing denominator. Croissant metadata uses the official inline context and JSONPath field sources; optional mlcroissant 1.1.1 parses 2 RecordSets without product runtime dependencies.

## Retain source branches on delivery

On October 13, 2026, GitHub reported automatic branch deletion enabled. The coordinator changed only `delete_branch_on_merge` to `false` and verified the live readback, applying this repository's explicit feature-branch retention instruction. Other settings, protections, and Dependabot were unchanged.
