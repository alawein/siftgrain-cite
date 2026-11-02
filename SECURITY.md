# Security policy

## Supported versions

Security fixes target the latest release only. Use the latest release when reporting a vulnerability.

## Report a vulnerability

Email <contact@meshal.ai>. Do not open a public issue for a vulnerability.
Include the affected version, steps to reproduce, expected behavior, and observed impact.
Use synthetic packet content and leave out private source text, credentials, and personal data.

## Scope

This policy covers the single-file page, the packet schema, and the build scripts.
Imported packets and text are untrusted input. A failure that lets imported text execute code,
sends packet content over the network, or saves a packet draft without opt-in is reportable.

## Built-in protections

- The built page uses a Content Security Policy with `default-src 'none'` and
  `connect-src 'none'`. Its inline scripts and style have SHA-256 hashes in the policy.
- The page displays user text through DOM text and form controls rather than HTML insertion.
- The page makes no network calls. Packet import, review, and export run in the browser.
- Packet draft storage is off by default. "Save draft on this device" opts in to local storage;
  restoring or clearing a draft requires a separate action. Theme preferences use separate storage.

The [build integrity tests](scripts/build.test.mjs) check the CSP hashes and network API absence.
The [browser hardening tests](tests/browser/hardening.spec.ts) cover inactive imported markup,
blocked network access, opt-in draft storage, and storage failures.
The [draft tests](src/ui/draft.test.ts) cover full or blocked device storage.

## Limits

Reviewers supply their own labels. Reviewer identity is self-reported and is not authenticated.
The page records human judgments and evidence spans; it does not determine whether a claim is true.

Source rights and permission to share source text are the user's responsibility.
Exported files can contain source text, reviewer labels, rationales, and review history.
The page does not control access to shared copies or revoke them. Review their contents before
sharing and choose an appropriate storage and sharing method.

Device draft storage is browser storage, not an access-control or encryption feature.
Turning draft saving off leaves an existing saved copy in place. Use "Clear saved draft" to remove it.
