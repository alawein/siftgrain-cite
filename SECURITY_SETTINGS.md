# Security settings

## Current authorized controls, October 8, 2026

The owner explicitly excludes the entire Dependabot family: alerts, security
updates, version-update configuration and automated PRs. Do not enable or modify
any of these, including `.github/dependabot.yml`. The earlier enablement proposal
is superseded. No Dependabot setting is changed by this local closeout.

Existing CI performs report-only `npm audit --omit=dev`; development dependency
coverage can be inspected with `npm audit`. Audit results are not proof of security.
Supported non-Dependabot controls include pinned workflow actions, least-privilege
job tokens, exact artifact verification, hosted build attestations, OIDC registry
publication, branch protection and secret scanning/push protection where available.
Observed settings and live execution are reported by the coordinating agent;
prepared workflow code does not prove enforcement or deployment.

The authenticated maintainer UI is
<https://github.com/alawein/siftgrain-cite/settings/security_analysis>.
The exact URL is narrowly excluded from anonymous link checks because it requires
maintainer access. Public documentation/release links are not exempted.

Registry trusted-publisher setup is authorized. Credentials remain human-entered
through the managed flow. Do not create/rotate a token to bypass missing access.

## Dated read-only evidence

Before v0.3.0 publication on October 8, API checks found Dependabot security
updates disabled, vulnerability alerts disabled (HTTP 404 with GitHub's explicit
"Vulnerability alerts are disabled" response), and automated security fixes
`enabled: false, paused: false`. No setting was changed in that inspection.
This historical readback does not establish every current non-Dependabot control.

## Readback and optional restore paths, October 13, 2026

Authenticated repository API reports Dependabot security updates disabled; vulnerability-alerts endpoint returned404 with the explicit message "Vulnerability alerts are disabled"; automated-security-fixes returned enabled:false, paused:false. Secret scanning and push protection are enabled in the observed repository snapshot. This task changed none of these settings. Current settings are not a historical settings-change log. Existing required main/release-tag rulesets remain active.

Report-only production and development npm audits run in CI. Local audit details and environment are summarized in RESULTS.md; they do not establish security. No runtime npm dependencies are added. Dev-only axe/Lighthouse packages expand the development dependency surface; report findings rather than silently upgrading or weakening required checks.

Optional owner-only restoration instructions, not authorization or a recommendation to change the exclusion: repository Settings > Security > Advanced Security (older UI: Code security and analysis) > Dependabot alerts > Enable; Dependabot security updates > Enable. Version updates require a separately reviewed .github/dependabot.yml. Exact maintained entry URL is above. Leave the entire family off unless the owner expressly changes that instruction. Do not create tokens or modify credential settings to make a check pass.
