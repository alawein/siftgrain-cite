# User guide

A packet holds source text, claims, and review history. A claim names candidate sources through citations; reviewing a claim and citation records your judgment about one exact source passage. A reviewer label is self-reported, not a verified identity.

## Open the page

Open the [browser demo](https://alawein.github.io/siftgrain-cite/) to try the built-in examples.

With Node 22.12 or newer, run `npm ci` and `npm run build` in a local checkout, then open `dist/index.html` in your browser. The built page works locally without a server.

Use **Appearance** to choose **Dark** or **Light**. Choose **Pause motion** to stop motion.

## Your first review

This walkthrough uses the existing synthetic refund example. Its inputs and worked judgments
are scripted practice material, not observations of a real refund or an accuracy benchmark.
Export any current work before replacing it with an example.

1. Choose **Load acceptance example**. The packet starts with four unreviewed claims.
2. In **Claim**, choose **The refund amount was USD 120.** In **Citation**, choose
   **Synthetic refund case 1042**.
3. In **Source text**, select **the refund amount was USD 100.** Choose **Use selected span**
   and check **Selected passage**. You can also enter **Span start** `176` and **Span end** `206`;
   these UTF-16 offsets apply only to this unchanged built-in source.
4. Choose **Contradicted** as the **Verdict**. For **Rationale**, write
   `The source records USD 100, which contradicts the claimed USD 120.` Enter a
   **Reviewer label** of your choice, then choose **Save review**.
5. Check **Review history** for your judgment, rationale, and passage. You have reviewed one
   claim and citation pair; the remaining three claims still need review.
6. Choose **Export packet** and confirm that the browser saved the JSON file. **Save review**
   keeps work in memory; the exported native packet is your portable copy.
7. On a fresh visit, choose **Import packet** and open that export. Confirm that your review
   and rationale remain in **Review history** before continuing.

The expected outcome is one recorded human judgment with an exact evidence span and a
resumable export. Cite checks the packet's structure, source hashes, and span consistency;
you decide whether the passage supports or contradicts the claim.

The other claims illustrate different evidence limits: an observation can be too old for
the requested acceptance time, and a state already present at baseline does not establish
that the agent caused a change. Read the timestamps and baseline before recording a verdict.
**Load synthetic worked judgments** provides separate scripted examples for comparison,
not a score for your answers.

## Make or load a packet

Choose one starting point:

- **New packet** opens the builder. For one source and one claim, paste **Source text** and **Claim text**, then choose **Use packet**. Source and claim IDs and the source title have editable defaults. Each new claim starts with that source's citation only when the builder contains one source and its ID is nonblank. Use **Add source** or **Add claim** for more rows. With multiple sources, enter the intended source IDs in **Citations (comma or newline separated)** for each new claim. Changing a source ID does not change existing citations: update those citations too, or validation will reject the packet and keep your current work. **Download packet file** saves the builder's packet without adding review judgments. Source hashes are computed in the page; pasted CRLF line breaks arrive as LF in builder text. After reviewing, **Export packet** saves the native packet for later **Import packet** and resumption.
- **Import packet** loads native packet JSON. The packet must be valid UTF-8 without a byte-order mark and no larger than 5 MiB. Older version 1 packets migrate to version 2. Invalid imports keep current work. If replacement would discard unsaved work, choose **Replace current packet** or **Keep current work**.
- **Load synthetic example** loads a practice packet. **Load acceptance example** loads four unreviewed claims about synthetic refund evidence; follow the **Acceptance review guide** on the page. **Synthetic worked judgments** contains **Load synthetic worked judgments**, a separate packet of scripted judgments. These examples do not grade your answers. If you have unsaved work, click the same load button again only when you want to replace it.
- **Import RAG trace JSON or JSONL** loads the supported local trace shapes in the [adapter contracts](adapters.md). Export current work first. Supplied documents become candidate citations; their actual use in generating the answer is unverified.

## Review a claim

1. Choose **Claim**, then **Citation** to display the source you want to review.
2. Select a passage in **Source text**, then choose **Use selected span**. Check **Selected passage**. Alternatively, enter **Span start** and **Span end** as UTF-16 offsets, with an inclusive start and exclusive end. Invalid spans and offsets that split a surrogate pair are rejected.
3. Choose **Verdict**: **Supported**, **Partial**, **Contradicted**, or **Unverifiable**, based on your reading of the passage.
4. Write **Rationale** to explain your judgment, and enter a **Reviewer label**. Both are required.
5. Choose **Save review**. The judgment appears in **Review history** and is saved in memory. Saving another judgment appends history rather than erasing the earlier record.

Check whether an observation is recent enough for the claim yourself. An unchanged source hash does not make an old observation fresh. Save and export your own reasoning; the app does not decide the verdict for you.

## Keyboard shortcuts

- **Alt+J** selects the next unreviewed claim/citation pair, like **Next unreviewed**.
- **Alt+K** selects the previous pair, like **Previous item**.
- Both queue shortcuts return focus to **Claim** and announce the selected queue position through the page's status region.
- **Tab** and **Shift+Tab** move between controls. **Skip to review form** jumps past the opening controls.

See [accessibility](accessibility.md) for keyboard order and the limits of the automated checks. Manual screen-reader testing remains unverified.

## Export and resume

Choose **Export packet** and confirm that your browser saved the JSON file. This native packet preserves review history and is the format for resuming work. On a later visit, choose **Import packet** and select that export.

**Save review** alone does not save a portable file. Closing the page without an export or an available saved draft loses work. The unsaved-close warning remains until native export, even when device draft saving is enabled. Other export formats do not clear that warning.

## Source changed (stale reviews)

When **Import packet** loads a revised packet with changed source text, its matching source hash, and earlier review history, a raw hash mismatch marks the earlier reviews stale. **Review history** keeps their verdicts and rationales but does not quote the changed source as their original passage. Even a **normalization-only stale** review remains stale; offsets and judgments are not moved automatically.

Choose **Claim** and **Citation**, select evidence from the current **Source text**, and use **Save review** to append a new judgment. Choose **Export packet** to preserve both versions. The [packet contract](contract.md) explains hashes, selectors, and stale history.

## Merge two reviewers

Each reviewer packet must have the same sources and claims. Use a distinct **Reviewer label** for each reviewer and **Export packet** to save their work. Keep both original exports if you need separate copies of the reviews before merging.

Use **Import packet** to load one export, then **Merge reviewer packet** to select the other. Sources and claims must match, including citation order. Exact duplicate reviews are deduplicated; conflicting duplicate review IDs reject the merge and keep current work. New history from the selected packet appends after current history. Choose **Export packet** to save the merged result.

New reviews receive random UUID-based IDs so independent copies can merge their work. Existing imported IDs stay unchanged; conflicting existing IDs still reject the merge and keep current work. Different reviewer labels do not resolve an ID conflict.

The agreement display uses the latest appended nonstale rating per reviewer and claim/source pair. It reports complete pairs, missing ratings, excluded stale records, and available coefficients. Self-reported labels do not establish independent reviewers, and agreement is not claim accuracy. See the [merge contract](adapters.md#merge-and-agreement) for the calculation limits.

## Exports for other tools

Keep an **Export packet** copy before using these separate formats:

- **Export CSV** provides review rows for analysis. Potential spreadsheet formulas are prefixed, but spreadsheet import behavior varies; retain native JSON for integrity metadata.
- **Export AIS labels** and **Export ALCE labels** provide analysis interchange, not automatic scores. Current supported reviews map to attributable/1; other current verdicts map to not attributable/0. Stale attribution and AIS interpretability remain null. Compatibility with native external scorers is unverified; see [adapter contracts](adapters.md#analysis-labels-v1).
- **Export W3C JSON-LD** provides review annotations with quoted text and code-point positions. Legacy stale reviews without original selectors prevent this export; use **Export packet** to retain that history. [Interoperability checks](interoperability.md) cover a named offline consumer, not every annotation application.

These formats do not replace the native resumable packet.

## Save draft on this device

Check **Save draft on this device** to write the current packet and later import/build/save changes to browser storage. Saving starts off on each page load; drafts are not automatically restored. Choose **Restore saved draft** to load one explicitly. Export unsaved current work before restoring. Choose **Clear saved draft** to remove the stored copy.

Drafts may contain sensitive source text and are specific to the browser and origin. Storage can be blocked or cleared, especially for local files. Storage failure keeps current work in memory and disables draft saving; review and export remain available. **Export packet** is still the portable copy.

## What this tool does not do

Cite records a reviewer's judgment and exact evidence span; it does not determine claim truth. Hash and span checks establish consistency with supplied text, not authorship, source truth, semantic support, or the freshness of an observation.

The page has no automatic judge, source retrieval, OCR/PDF extraction, server, accounts, or telemetry. It does not verify reviewer identity, grade practice judgments, or certify accessibility or third-party format compatibility. You remain responsible for source rights and sharing exported text.
