# MahjongScoreApp Development Guardrails

Before modifying code in this repository, read:

1. `docs/pre-change-checklist.md` — short mandatory pre-change checklist.
2. `docs/known-mistakes-and-prevention.md` — detailed known mistakes and regression lessons.
3. `docs/development-time.md` — only when answering/updating cumulative development time.

Rules:
- Do not repeat a known mistake without first checking the relevant entry.
- Before fixing a bug, state the symptom and root cause. If root cause is not confirmed, label it as unconfirmed and investigate first.
- After discovering a new mistake/regression, add it to the known-mistakes log with cause, fix, prevention, and regression test.
- GitHub `main` is the current code source of truth; do not treat an old ZIP as latest.
- For iPhone/PWA regressions, verify on the actual PWA flow, not only by code inspection.
