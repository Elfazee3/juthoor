# Juthoor M4 / Follow-up Loop — State

> Machine-maintained. One task per iteration. Statuses:
> `TODO` · `IN_PROGRESS` · `DONE` · `DONE (LIVE-APPLIED)` · `BLOCKED(reason)`.
> Protocol + acceptance criteria: `docs/M4_LOOP_BRIEF.md`.
> Phase-1 history (do not modify): `docs/FIX_LOOP_BRIEF.md` + `docs/LOOP_STATE.md`.

## ⚙️ OPERATING MODE (set 2026-07-12)

**LIVE-APPLY PRE-AUTHORIZED** for tasks tagged `[LIVE-APPLY]` on this board — the
founder authorized MCP pushes on 2026-07-12 ("use supabase MCP … push those
migrations"). Discipline per apply (brief §2.2): local `db reset` + full pgTAP
green FIRST → `mcp__supabase__apply_migration` → live catalog+smoke verification →
`get_advisors(security)` (fix any NEW warn immediately) → ledger row here.
Additive DDL / CREATE OR REPLACE / grants only. **Never flip
`app_settings.auto_merge_enabled`. Never merge the PR.**

## Environment status (fill at F0)

- Baseline gates: _record at F0_ (expected: typecheck 0 · lint 0/0 · 131 unit ·
  pgTAP 183 · E2E 15 passed/2 skipped).
- Docker/local stack: _record at F0_.
- MCP live access (`nlufpicjdeeqcgepewdg`): _record at F0_.

## Task board (execute in table order, respecting Deps)

| ID | Task | Tags | Deps | Status | Notes |
|----|------|------|------|--------|-------|
| F0 | Bootstrap: branch `feat/m4-followups` off up-to-date `main`; commit these two loop docs; record baseline gates + stack + MCP access (brief §6-F0) | — | — | TODO | |
| F1 | Apply the 12 remaining feature-schema migrations to live, in timestamp order, with pre/post verification + advisors + ledger (brief §6-F1) | db, [LIVE-APPLY] | F0 | TODO | |
| F2 | `profiles.self_person_id` drift: introspect live → guarded local migration (no-op where column exists) + types check; NOT applied to live (brief §6-F2) | db, drift | F0 | TODO | |
| F3 | Explicit table GRANTs migration (schema privilege-self-contained; per-table by actual RLS policy targets; deny-all engine tables get none) + live apply (brief §6-F3) | db, ci, [LIVE-APPLY] | F1 | TODO | |
| F4 | Guarded pg_cron schedules (features_nightly / nightly_match / weekly_full / weekly_eval) + `/api/cron/run-matching` fire-and-forget fallback route (no secrets committed) (brief §6-F4) | db, ops, [LIVE-APPLY] | F1 | TODO | |
| F5 | `run_matching_batch` completion: person_links(proposed) UPSERT (never downgrade human decisions) + `drain_overlay_refresh()` at batch end; tests updated (brief §6-F5) | db, matching, [LIVE-APPLY] | F1 | TODO | |
| F6 | Re-enable the Playwright e2e job in CI and make it green on this loop's PR (brief §6-F6) | ci, [E2E] | F0 | TODO | |
| F7 | Replace the quarantined Nextbase `private-items` spec with a real Juthoor owner-flow spec; local `test:e2e` green with 0 quarantined (brief §6-F7) | test, [E2E] | F0 | TODO | |

## Live-apply ledger

_One row per migration applied to live (`nlufpicjdeeqcgepewdg`): file · live version
stamp · verification · advisors result. Phase-1 applies (4 security migrations,
2026-07-12) are recorded in `docs/LOOP_STATE.md`'s ledger — do not duplicate them
here. Remember: MCP stamps apply-time versions; keep the `db push` migration-repair
guidance pattern from that ledger for anything added here._

| Migration | Live version | Verified | Advisors |
|---|---|---|---|
| _none yet_ | | | |

## Iteration log

| # | Date | Task | Result | Note |
|---|------|------|--------|------|
| _none yet_ | | | | |
