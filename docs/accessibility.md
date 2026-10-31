# Accessibility

Cite supports keyboard review of a loaded packet. In the review form, Tab reaches Claim, Citation, Source text, Use selected span, Span start, Span end, Verdict, Rationale, Reviewer label, and Save review in that order. Shift+Tab moves backward. Source text is read-only; the numeric span fields allow direct entry of UTF-16 offsets.

Alt+J selects the next unreviewed citation pair. Alt+K selects the previous pair. Both return focus to Claim and update the polite status with the selected queue position. The page also has a Skip to review form link before the viewer settings and import controls.

The main status has `role="status"` and `aria-live="polite"`. The selected passage and saved judgment also have polite live regions. Error status uses `role="alert"`. These attributes identify updates for assistive technology; they do not establish how a screen reader announces them.

Dark is the default appearance, and Light is available through Appearance. Keyboard-focused controls have a visible outline in both themes. With the system preference for reduced motion enabled, CSS animations and transitions are disabled. The reduced-motion browser check triggers the selected-passage effect and confirms that no CSS animation runs in the main panel or its descendants, including pseudo-elements.

Automated Chromium checks cover the keyboard order and focus rings, both queue shortcuts and their polite status updates, reduced motion, and axe checks with the acceptance example loaded. Axe reports zero violations in both themes at 1280 px and 390 px widths for the tested state. The checks do not cover every packet or interaction, and zero automated violations do not establish accessibility conformance.

For this change, manual screen-reader testing has not been done.
