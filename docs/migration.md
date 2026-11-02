# Migration

Displayed name is Siftgrain Cite and the GitHub repository is
`alawein/siftgrain-cite`. The npm package remains `claim-review`; no import path,
packet namespace, tag or native packet version changes. Build with `npm ci` and
`npm run build`, then open `dist/index.html`. Existing v0.2 schema1 packets
migrate to schema2 without changing source text; use native Export packet to
preserve enriched history. W3C and CSV/label exports do not replace the resumable
packet.

The repository was renamed to `alawein/siftgrain-cite`. Package metadata and the
release-workflow repository guard use that repository name. Read back the native
npm trusted publisher binding against `alawein/siftgrain-cite`; local metadata
does not prove that registry configuration changed.

Preferences use siftgrain-viewer (theme only; older look preferences are ignored). Drafts retain claim-review.draft.v1 and require explicit opt-in. No automatic restore. Merge right-hand novel history takes append precedence, with labels self-reported. Export both original reviewer packets before merging if you need independently frozen inputs.

## Repository and distribution identities

The GitHub repository is now `alawein/siftgrain-cite`; keep the npm package name `claim-review` and published schema identifiers for compatibility. Preserve all existing tags and feature branches.

- Any future repository transfer requires exact destination approval, followed by verification of required checks and Pages. No transfer command executed.
- Dataset upload, only after rights and named destination approval: `hf upload alawein/siftgrain-cite benchmarks/artifacts --repo-type dataset`. Current local mixed-rights archive must not be bulk uploaded without preserving ALCE MIT notice and Wikipedia attribution/share-alike obligations; synthetic-only publication is the safer scoped choice.
- New release after a named version is approved: `gh release create <approved-version> benchmarks/artifacts/siftgrain-cite-v1.zip --repo alawein/siftgrain-cite --target <reviewed-sha> --notes-file <reviewed-notes>`. Placeholders are intentionally unresolved consequential decisions, not executable authorization.

Keep canonical package name claim-review for this compatible improvement. Existing npm publication failures remain historical facts, not evidence of registry ownership or current publication.
