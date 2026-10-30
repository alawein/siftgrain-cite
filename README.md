# Siftgrain Cite

Offline browser tool for researchers and reviewers who check claims against exact source passages and export the reasoning.

![Siftgrain Cite wordmark](brand/wordmark.svg)

Cite records a reviewer's judgment and exact evidence span; it does not determine claim truth. It is the human citation-review tool in the Siftgrain suite, alongside
[Siftgrain Audit](https://github.com/alawein/siftgrain-audit) for evaluation
completeness and [Siftgrain State](https://github.com/alawein/siftgrain-state)
for checking requested outcomes against supplied observations. The npm package is named `claim-review`.

Import local RAG trace JSON/JSONL, triage with Alt+J / Alt+K, merge reviewer packets, and compare Cohen/Fleiss kappa or nominal Krippendorff alpha. Labels remain self-reported. The native packet preserves all history; CSV and AIS/ALCE analysis labels have the bounded [adapter contract](docs/adapters.md).

Dark is the default; Appearance offers a light theme. Calm, Cartoon, Pixel and Lab change density and motion. Preferences store only those choices with guarded access, independently of opt-in packet drafts.

| Cartoon | Calm | Pixel | Lab |
| --- | --- | --- | --- |
| ![Recorded Cartoon workflow](docs/demos/cartoon.gif) | ![Recorded Calm workflow](docs/demos/calm.gif) | ![Recorded Pixel workflow](docs/demos/pixel.gif) | ![Recorded Lab workflow](docs/demos/lab.gif) |

These are recordings from the real offline app using explicitly synthetic scripted judgments. They do not represent human annotations.

More: [benchmark results](RESULTS.md), [performance](PERF.md), [research](RESEARCH.md), [migration](MIGRATION.md), and [requirement coverage](docs/requirements.md). To build the local benchmark packets, install Python and Node, run `python benchmarks/fetch.py` once (it needs network access), then `npm run bench` (`make bench` is an alias). The run generates dev/test packets, separate answer keys and a downloadable ZIP. External text remains fetch-only.

![Evidence review](assets/label-purpose.svg)
![TypeScript](assets/label-stack.svg)
![Offline browser](assets/label-runtime.svg)

Import source text, select a passage, and record whether it supports, partly
supports, contradicts, or cannot verify a claim. Export the packet to preserve
your review history. No account, model, or server.

![Siftgrain Cite packet builder with a synthetic example](docs/screenshots/app.png)

## Use

Clone the repository, install Node 22.12 or newer, then build with `npm ci` and
`npm run build` and open `dist/index.html`.
Start with **New packet** (type sources and claims; hashes are computed in the
page and pasted CRLF arrives as LF), **Load synthetic example**, or **Import packet**.
Choose a claim/citation, select source text with **Use selected span** or enter
UTF-16 offsets, choose a verdict, write rationale and reviewer label, then save.
**Export packet** preserves all history. Reimport that JSON to continue. Existing
v0.2 packets load and migrate to the enriched native format.

For the Agent Acceptance refund demo, choose **Load acceptance example**. Its four
claims start unreviewed: a recent enabled-state observation, a conflicting refund
amount, an old completion observation, and an already-true baseline. Review each
claim using the **Acceptance review guide**: select a claim-specific passage,
record your human judgment and rationale, then choose **Export packet** and
reimport that native JSON to resume. Check observation age yourself; a source-hash
change separately marks saved reviews stale. CSV, AIS/ALCE labels and W3C JSON-LD
are sibling exports rather than replacements for the resumable native packet.
**Synthetic worked judgments** offers a
separate packet of labeled example judgments. It does not grade your answers.
Loading an example asks for a second click before replacing unsaved packet work.

To exercise source revisions, import a revised packet containing changed source
text, its matching hash, and earlier reviews. Their original hashes and rationales remain visible
as stale history; save a new review against the current source, then export and
reimport. An old completion observation and a review of a changed source are
different: the first needs a human freshness judgment; the second is marked stale
by the source hash.

**Export W3C JSON-LD** exports review annotations with exact quoted text and
code-point positions. [Offline interoperability checks](docs/interoperability.md)
use `jsonld` 9.0.0 and a pinned W3C context outside the product bundle.
It does not replace the resumable native packet. Legacy
stale history without original selectors must use native export; the W3C button
reports this limitation. [Packet schema](schema/claim-review-packet.v1.json) and
[contract](docs/contract.md) describe the formats and validation boundaries.

Processing stays in memory unless you check **Save draft on this device**.
Packet draft storage is not accessed unless you opt in or explicitly restore/clear
an existing draft. Saving is off on each page load; **Restore saved draft** is
an explicit action. Blocked storage leaves review and export usable. Stored drafts
can contain sensitive text, are specific to the browser/origin, and may be erased
by the browser. Local-file storage behavior varies by browser. Export remains the
portable copy; the unsaved-close guard remains even with draft saving enabled.

Closing without export or an available saved draft loses work. No upload, source
fetch, telemetry or background service. Reviewer labels are self-reported; the
packet explicitly records `reviewer_identity_assurance: "self-reported"`. Source
rights and exported file sharing remain your responsibility.

## What it verifies

SHA-256 of exact supplied valid Unicode source text, a separate SHA-256 of its
NFC form, span boundaries, references, field structure and history integrity.
Original text and raw hashes are preserved. A raw hash change keeps old reviews
stale; matching NFC hashes label them **normalization-only stale** without moving
the judgment to new text. Old passages are never quoted from changed sources.
Latest means last appended per claim/citation pair.

Native offsets stay UTF-16 for textarea compatibility. Each available judgment
also carries a TextQuoteSelector with up to 32 code points of prefix/suffix and
a TextPositionSelector with code-point offsets. Conversions reject surrogate
splits. Combining marks are separate code points; grapheme boundaries are
preferred but not enforced. Plain text remains literal, including CRLF.

Hash consistency is not truth, authorship or semantic entailment. These are human
judgments, not automated accuracy scores. JSON-LD export follows the W3C selector
and annotation structures tested against published examples and the named offline
JSON-LD consumer; arbitrary W3C import
and compatibility with third-party annotation systems are unverified. English UI
preserves Unicode/Arabic text; manual screen-reader coverage is unverified.
[Evaluation](docs/evaluation.md), [study protocol](docs/study-protocol.md),
[bounded usefulness](docs/usefulness.md), [provenance](docs/provenance.md).

## Develop

Node 22.12 or newer (`.node-version` pins 22.23.2), locked dev-only dependencies:

```sh
npm ci
npm run check
npm run validate:schema
npx playwright install chromium firefox webkit
npm run test:browser
```

To validate another packet, run `npm run validate:schema -- path/to/packet.json`.
The development validator combines JSON Schema 2020-12 structure checks with
runtime hash, reference, uniqueness, UTF-16 limits and selector checks. Standard
JSON Schema alone cannot establish those semantic invariants.

Build creates `dist/index.html` with inline CSS, one classic bundled script and a
CSP permitting only their exact hashes, with `default-src 'none'`. `node scripts/serve.mjs`
serves that build at 127.0.0.1:4173. No runtime package or shared-repo dependency; local design tokens build into the HTML.
Tests cover native round trips, invalid-input preservation, randomized Unicode,
exact selectors, guarded drafts, inert active text and offline local-file operation
in Chromium, Firefox and WebKit.
The acceptance demo also checks confirmation before replacing work, human review and
export/reimport, stale-source history, and the evidence layout at 1440px and 390px.
These checks establish workflow and integrity, not semantic accuracy.

## Related work and how this differs

The [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)
defines the selector and JSON-LD structures used by the export adapter. Its
published quote and position examples are exercised as literal test cases.
The [Selectors and States note](https://www.w3.org/TR/selectors-states/) provides
additional selector guidance. Siftgrain Cite keeps exact supplied plain text,
hash-bound review history and an offline interface; it does not retrieve web
documents or implement a general annotation service.
[AIS](https://arxiv.org/abs/2112.12870v2) defines attribution and a two-stage human
annotation protocol. [ALCE](https://arxiv.org/abs/2305.14627v2) evaluates generated
answers with automatic citation-quality measures, including recall and precision.
This tool records supplied human judgments; it does not execute those evaluations
or establish agreement between annotators. The study protocol describes proposed
measurement without fabricated annotations or results.

Code is MIT licensed (see [LICENSE](LICENSE)).
