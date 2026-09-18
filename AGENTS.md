# MahjongScoreApp Development Guardrails

Before modifying code in this repository, read in this order:

1. `docs/user-development-rules.md` — **user-specified workflow and development rules; mandatory before every change**.
2. `docs/pre-change-checklist.md` — short mandatory pre-change checklist.
3. `docs/known-mistakes-and-prevention.md` — detailed known mistakes and regression lessons; read the entries relevant to the planned change.
4. `docs/development-time.md` — only when answering/updating cumulative development time.

Rules:
- Do not re-ask a decided specification before checking the project records.
- Do not repeat a known mistake without first checking the relevant entry.
- Before fixing a bug, state the symptom and root cause. If root cause is not confirmed, label it as unconfirmed and investigate first.
- When the user reports a bug/fix request, fix it and also continue the originally planned next feature in the same version unless doing so would make an urgent recovery impossible to isolate.
- Batch functional tests and make them continuous; avoid making the user rebuild the same setup/hand repeatedly.
- After discovering a new mistake/regression, add it to the known-mistakes log with cause, fix, prevention, and regression test.
- After the user adds or changes a development rule, update `docs/user-development-rules.md`.
- GitHub `main` is the current code source of truth; do not treat an old ZIP as latest.
- Prefer direct GitHub edits over asking the user to download/unzip/drag files.
- For iPhone/PWA regressions, verify on the actual PWA flow, not only by code inspection.
- When the user says the work session is over, save the session record and update development time if the user supplied a duration.
