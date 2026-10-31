# Functional evidence

The v0.2 baseline had 43 passing unit tests and a successful lint, TypeScript and
build check. Its browser attempt completed 24 cases, timed out in Firefox's
large-packet export case, and left eight cases unrun after stalled worker teardown.
That exact case subsequently passed independently in 19.6 seconds and in the full
v0.3 run in 21.5 seconds. This does not retroactively make the baseline green.

The v0.3 suite adds exact/code-point selectors, v0.2 migration, raw/NFC hashes,
normalization-only stale state, structural schema plus semantic validation,
JSON-LD annotations and incremental migrated-export byte limits. Randomized
Unicode checks use fast-check with recorded seed 20261008: 300 span/offset trials
and 100 source-hash/export/reimport trials include astral emoji, supplementary
CJK, math symbols, combining sequences, Arabic and CRLF. The SHA-256 known vector
remains independently checked. Fixtures exercise legacy inputs and canonical
exports, malformed references/hashes/selectors, forged identity assurance,
surrogate splits, duplicate IDs, exact fields and caps.

Browser coverage includes four actual synthetic judgments, native export/reimport,
invalid-import preservation, keyboard navigation, packet builder recovery,
status alerts/focus, file reselect, unsaved-close guard before/after export,
320px reflow and doubled text, inert script/event-handler/javascript-URL text,
opt-in draft save/restore/clear and unavailable storage. The standalone file flow
blocks HTTP and HTTPS in Chromium, Firefox and WebKit. The strict build CSP blocks
connections and untrusted inline script/style. The doubled-text simulation alters
the existing stylesheet through CSSOM; injecting new style is correctly denied.
This is an automated simulation, not manual zoom or screen-reader certification.

Initial migration/selector/normalization feature tests failed for missing behavior.
The draft, unavailable-storage and CSP browser tests each failed before those
features existed. A migrated packet that would exceed the native import byte limit
failed its regression before incremental byte accounting was added.

Windows WebKit's simulated setOffline flag historically caused NotReadableError
on local exported files. HTTP/HTTPS route blocking preserves filesystem reads.
This is not an OS network-cable isolation test. W3C quote and position examples
exercise published selector values; third-party consumer interoperability remains
unverified. The app never retrieves the context URL.

Judgments are synthetic workflow expectations, not independent semantic labels.
No test result establishes adoption, source authenticity, semantic accuracy or
annotator agreement. The proposed study protocol requires real independently
collected annotations and measured results before any research claim.
