# Lessons

One line per lesson, newest at the bottom. An agent adds a line after every PR
or session. A weekly review promotes repeated lessons into `AGENTS.md` or the
shared standards, then marks the line `promoted`.

Format: `YYYY-MM-DD | area | what happened | rule`

- Write what went wrong or right in plain words, then the rule that follows.
- One line. No names, secrets, or private paths.
- Do not delete a line. Mark it `promoted (PR NUMBER)` or `dropped (reason)`.

## Log

- 2026-10-04 | setup | Repo created from the kit starter | Run the check command once before the first change.
- 2026-10-04 | builder | New packet UI plus hardening kept packet rules untouched | Route creation through parsePacket and keep rule modules unchanged.
- 2026-10-04 | review-lanes | Parallel lanes caught a busy-state deadlock this PR introduced, plus missing dirty-guard/download coverage | Run async UI completions through one pending-operations counter with a ticket guard; cover destructive paths in the same PR.
- 2026-10-19 | draft storage | Read and clear failures left saving enabled despite the storage contract | Disable draft saving on every storage failure and require a fresh opt-in after recovery.
