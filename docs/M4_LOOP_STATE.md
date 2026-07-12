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

## Environment status (recorded at F0, 2026-07-12)

- **Baseline gates ✅ (fresh run):** typecheck 0 errors · lint 0/0 · 131 unit ·
  `db reset` exit 0 (all 44 migrations) · pgTAP **183/183 PASS**. E2E baseline
  15 passed / 2 skipped (green earlier tonight on the identical tree at PR #2
  merge; not re-run at F0 — first re-run happens at F6/F7).
- **Docker/local stack ✅** — `docker info` ok, supabase local running.
- **MCP live access ✅** — `nlufpicjdeeqcgepewdg`, PG **17.6**, 22 applied
  migrations (18 original + the 4 security applies from 2026-07-12). Note: one
  transient `fetch failed` on the first MCP call — retry once before treating MCP
  as down.
- Branch `feat/m4-followups` created off `main@c79a43d` (0 behind origin).

## Task board (execute in table order, respecting Deps)

| ID | Task | Tags | Deps | Status | Notes |
|----|------|------|------|--------|-------|
| F0 | Bootstrap: branch `feat/m4-followups` off up-to-date `main`; commit these two loop docs; record baseline gates + stack + MCP access (brief §6-F0) | — | — | DONE | Branch off `main@c79a43d` ✅ · docs committed (`d37bf9f`) ✅ · all baseline gates green (see Environment status) ✅ · MCP live access confirmed (PG 17.6, 22 migrations) ✅. |
| F1 | Apply the 12 remaining feature-schema migrations to live, in timestamp order, with pre/post verification + advisors + ledger (brief §6-F1) | db, [LIVE-APPLY] | F0 | DONE (LIVE-APPLIED) | **★ THE FULL ENGINE IS ON LIVE ★** All 12 applied in order (ledger). Pre-checks: no object pre-existed; compute_degrees/search signatures matched; pg_trgm present. Post: 17/17 tables, matview+unique idx, 2 views, 12/12 fns, **shadow row auto_merge=false thr=450**, authenticated grants present on user tables (live default-privs DO grant — CI issue was CI-only), 4 smoke tests ✅. Advisors surfaced engine-wide anon/PUBLIC executability → **+1 hardening migration `20260712010000_engine_functions_lockdown`** (local file + live p1/p2): PUBLIC+anon+authenticated revoked on engine internals (service_role re-granted), authenticated-only on user RPCs, matview + views de-anon'd. Final scan: 0 engine leaks; 2 DEFINER-view ERRORs accepted-by-design. Local reset+pgTAP 183/183 with the new file. |
| F2 | `profiles.self_person_id` drift: introspect live → guarded local migration (no-op where column exists) + types check; NOT applied to live (brief §6-F2) | db, drift | F0 | DONE | Live introspected: `self_person_id uuid NULL` + FK `profiles_self_person_id_fkey → persons(id)` (no ON DELETE action, no default/index/trigger). Migration `20260712020000_profiles_self_person_id.sql`: `ADD COLUMN IF NOT EXISTS` + guarded constraint — **no-op on live, NOT applied** (already there). Local `db reset` now creates it (verified count=1); pgTAP 183/183; typecheck 0 · lint 0/0 · 131 unit. `types/database.ts` MutableProfile already declared it correctly. Local schema == live schema for profiles now. |
| F3 | Explicit table GRANTs migration (schema privilege-self-contained; per-table by actual RLS policy targets; deny-all engine tables get none) + live apply (brief §6-F3) | db, ci, [LIVE-APPLY] | F1 | DONE (LIVE-APPLIED) | Migration `20260712030000_explicit_table_grants.sql`: grants derived from the actual policy map (28 tables — full CRUD where S/I/U/D policies exist; partial sets e.g. identity_verifications S/I/U, privacy_holds S/I/D, notifications/profiles S/U; SELECT-only for the 8 read surfaces; anon SELECT only where policies target role `public`; deny-all engine tables get NOTHING; service_role blanket). **Guarded per-table by `to_regclass`** — first apply failed on live-missing `content_blog_posts` (Nextbase leftovers `content_blog_*`+`private_items` are LOCAL-ONLY); guarded version is a correct no-op for absent tables. Local 183/183; live applied + required grants verified; advisors scan **identical to F1 baseline (no new lints)**. Note: pre-existing default-privilege SURPLUS (e.g. anon table-SELECT on persons, extra writes on hint tables) is deliberately NOT stripped — RLS gates rows (surplus exposes zero), and stripping would flip deny-all tests from 0-rows to permission-denied. F3 guarantees the floor. |
| F4 | Guarded pg_cron schedules (features_nightly / nightly_match / weekly_full / weekly_eval) + `/api/cron/run-matching` fire-and-forget fallback route (no secrets committed) (brief §6-F4) | db, ops, [LIVE-APPLY] | F1 | DONE (LIVE-APPLIED) | **★ THE SHADOW PERIOD IS TICKING ★** Migration `20260712040000_m4_cron_schedules.sql`: guard = `shared_preload_libraries LIKE '%pg_cron%'` + exception-wrapped (NOTICE-and-skip where impossible); 4 named jobs (upsert semantics): features_nightly 02:15 · nightly_match 23:30 Mon–Sat (incremental) · weekly_full 23:30 Sun · weekly_eval 01:00 Mon (`run_eval('frs-v1')`). pgTAP `m4_cron_schedules_test.sql` (3: -1-or-4 guard helper, job targets exist, **auto_merge still false**) — suite **186/186**. **LIVE: 4 jobs ACTIVE on pg_cron 1.6.4** (verified cron.job; first batch fires tonight 23:30). Advisors identical to baseline. Fallback `/api/cron/run-matching` (GET+POST): 501 without `CRON_SECRET`, Bearer auth, service-role client from env (none committed), **fire-and-forget via `after()`** (202 immediately; batch runs post-response; advisory lock 724242 makes pg_cron+fallback double-runs a no-op) + drains overlay queue. NOT wired into vercel.json (pg_cron is primary; enable by adding a cron entry + envs in Vercel if ever needed). Types: run_matching_batch + drain_overlay_refresh added by hand. Web gates green. |
| F5 | `run_matching_batch` completion: person_links(proposed) UPSERT (never downgrade human decisions) + `drain_overlay_refresh()` at batch end; tests updated (brief §6-F5) | db, matching, [LIVE-APPLY] | F1 | DONE (LIVE-APPLIED) | Migration `20260712050000_batch_completion.sql`. (a) Batch now UPSERTs a **`person_links` 'proposed'** row per queued pair (source='system', source_match_id, state-only breakdown); ON CONFLICT updates **only rows still 'proposed'** — confirmed/rejected/revoked never downgraded. (b) `drain_overlay_refresh()` called at batch end. **Latent bug fixed:** the drain's original `REFRESH … CONCURRENTLY` can never run inside a function (always in a txn) — it would have errored the first time anything was pending; now a plain refresh (documented: tiny matview, advisory-locked single caller). `run_matching_batch_test.sql` 6→9 assertions (proposed link created; confirmed link survives re-run; queue drained). pgTAP **189/189**; web gates green. **LIVE-APPLIED + smoked**: enqueue→drain roundtrip on live executed in-txn (old body would throw), fresh-statement check 0 unprocessed; shadow mode still OFF. Tonight's 23:30 batch runs the completed pipeline. |
| F6 | Re-enable the Playwright e2e job in CI and make it green on this loop's PR (brief §6-F6) | ci, [E2E] | F0 | DONE | **★ Playwright e2e GREEN IN CI (4m50s) on PR #3 ★** — first browser-E2E CI run in the repo's history. Workflow changes: removed `if: false`; `playwright install --with-deps chromium`; new step exporting `NEXT_PUBLIC_*` from `supabase status` into `$GITHUB_ENV` **before** `pnpm build` (Next bakes them into the client bundle at build time; runtime env comes via global-setup). Branch pushed (`-u` — bare `git push` had silently failed with no upstream; `\| tail -1` masked it → lesson: don't pipe push through tail) + **draft PR #3 opened** (workflow only triggers on PRs to main; drafts run CI; never-merge rule intact). One fix-forward: `export const dynamic='force-dynamic'` in the F4 route **fails the Turbopack BUILD under `cacheComponents`** (typecheck alone missed it — build-only rule) → removed (redundant there) + verified with a real local `pnpm --filter web build` (exit 0). All 4 checks green: e2e ✅ build ✅ pgTAP ✅ CodeRabbit ✅. |
| F7 | Replace the quarantined Nextbase `private-items` spec with a real Juthoor owner-flow spec; local `test:e2e` green with 0 quarantined (brief §6-F7) | test, [E2E] | F0 | DONE | Deleted `private-items.spec.ts` (A8's quarantine premise partly wrong — `/dashboard/new` still hosts the Nextbase form, but it's unreachable from the UI; tree creation has no discoverable UI yet). New `user/juthoor-owner-flow.spec.ts` (3 tests, real shipping journey): dashboard shows the 6 DiscoveryTabs lanes **incl. Connections (B17)** + the NotificationBell (B18); dashboard→`/tree` lands on the workspace **empty state** (heading شجرة عائلتي + إضافة شخص CTA — asserted from a live snapshot, not assumption); Connections tab→`/dashboard/connections` renders the lane. Clicks via `dispatchEvent` (B20 sidebar-overlap lesson). **Local suite 18 passed / 0 skipped** (was 15+2 quarantined). Web gates green. |

## Live-apply ledger

_One row per migration applied to live (`nlufpicjdeeqcgepewdg`): file · live version
stamp · verification · advisors result. Phase-1 applies (4 security migrations,
2026-07-12) are recorded in `docs/LOOP_STATE.md`'s ledger — do not duplicate them
here. Remember: MCP stamps apply-time versions; keep the `db push` migration-repair
guidance pattern from that ledger for anything added here._

| Migration | Live version | Verified | Advisors |
|---|---|---|---|
| `20260711020000_matching_m0_foundations` | `20260712023619` | app_settings single row `auto_merge=false thr=450` ✅ | see F1 summary row |
| `20260711040000_match_features_layer` | `20260712023656` | table + dirty queue + 6 triggers ✅ | |
| `20260711050000_transliterate_and_name_variants` | `20260712023731` | `transliterate('Ibrahim')`→`ابراهيم` ✅ | |
| `20260711060000_refresh_match_features` | `20260712023812` | fns present ✅ | |
| `20260711070000_score_pair` | `20260712023853` | | |
| `20260711080000_score_pair_gate` | `20260712023945` | `score_pair(∅,∅)`→`missing_features` contract ✅ | |
| `20260711090000_blocking` | `20260712024014` | | |
| `20260711100000_run_matching_batch` | `20260712024047` | service_role-only after lockdown ✅ | |
| `20260711110000_eval_harness` | `20260712024115` | `run_eval('frs-v1-live-smoke')` returns id ✅ | |
| `20260711120000_m3_review_surfaces` | `20260712024255` | matview+unique idx, 2 views, review-cards queryable ✅ | |
| `20260711130000_m3_link_rpcs` | `20260712024414` | RPCs present; authenticated-only after lockdown ✅ | |
| `20260711140000_compute_degrees_same_as_hop` | `20260712024451` | signature matched; DEFINER+guard ✅ | |
| `20260712030000_explicit_table_grants` | `20260712...` (F3 apply; guarded/no-op for local-only Nextbase tables) | required grants verified via has_table_privilege; advisors unchanged vs F1 baseline | no new lints |
| `20260712010000_engine_functions_lockdown` (one local file) | p1 `20260712024743` + p2 `20260712025011` | anon: NOTHING exec ✅ · authenticated: only user RPCs (score_pair/resolve_match/resolve_match_hint/confirm/reject/revoke_person_link/compute_degrees) ✅ · engine internals service_role-only ✅ · person_identity_groups no client role ✅. **Gotcha:** Postgres grants fn EXECUTE to PUBLIC by default — revoking a role does nothing while PUBLIC carries it; p2 revokes PUBLIC + re-grants explicitly | **F1 advisors summary:** 0 engine leaks. Remaining: 2 ERROR `security_definer_view` (match_review_cards, v_match_explanations) — **ACCEPTED BY DESIGN** (admin-only matches RLS mandates DEFINER; internal auth.uid() filter pgTAP-proven); 7 INFO `rls_enabled_no_policy` = the deny-all engine tables (the design); pre-existing WARNs unchanged (update_updated_at search_path, unaccent-in-public, by-design tree-access RPC grants, leaked-password toggle) |

**`db push` reconciliation (if ever used):** repair `--status applied` for `20260711020000 20260711040000 20260711050000 20260711060000 20260711070000 20260711080000 20260711090000 20260711100000 20260711110000 20260711120000 20260711130000 20260711140000 20260712010000` and `--status reverted` for the MCP stamps `20260712023619…20260712025011` above (plus the phase-1 stamps listed in LOOP_STATE.md's ledger).

## Iteration log

| # | Date | Task | Result | Note |
|---|------|------|--------|------|
| 1 | 2026-07-12 | F0 | DONE | Bootstrap: branch `feat/m4-followups` @ main c79a43d, loop docs committed (d37bf9f), baseline green (typecheck 0 · lint 0/0 · 131 unit · pgTAP 183/183 on fresh reset), Docker+stack up, MCP live access OK (PG 17.6, 22 migrations; 1 transient fetch-fail → retry worked). Next: F1 — apply the 12 feature-schema migrations to live, in timestamp order. |
| 2 | 2026-07-12 | F1 | DONE (LIVE-APPLIED) | **★ FULL ENGINE ON LIVE (12 migrations + lockdown hardening) ★** Pre-checked, applied in order, verified (17 tables/matview/views/12 fns/shadow-mode row/4 smokes), advisors → engine-wide PUBLIC-grant leak found & fixed (`engine_functions_lockdown` p1+p2: PUBLIC-default gotcha), final scan 0 engine leaks (2 DEFINER-view ERRORs accepted-by-design, documented). Local 183/183 with the new file. Live now at 35+2 migrations. Next: F2 (self_person_id drift). |
| 3 | 2026-07-12 | F2 | DONE | self_person_id drift closed: live introspected (uuid NULL + bare FK to persons), guarded reconstruction migration `20260712020000` (no-op on live, NOT applied), local reset creates it, 183/183 + web gates green, types already correct. Local profiles == live profiles. Next: F3 (explicit GRANTs migration). |
| 4 | 2026-07-12 | F3 | DONE (LIVE-APPLIED) | Explicit grants from the policy map (28 tables, guarded per-table — discovered Nextbase `content_blog_*`/`private_items` are local-only; first unguarded apply failed clean on live, guarded version applied). Local 183/183; live grants verified; advisors identical to baseline. Schema now carries its own privilege floor → CLI upgrades can't regress CI. Next: F4 (pg_cron schedules + Vercel fallback route). |
| 5 | 2026-07-12 | F4 | DONE (LIVE-APPLIED) | **★ SHADOW PERIOD LIVE ★** Guarded pg_cron migration + 4 ACTIVE jobs on live (1.6.4; nightly_match 23:30 Mon–Sat, weekly_full Sun, features 02:15, eval Mon 01:00) — first production shadow batch fires TONIGHT 23:30. Fallback route `/api/cron/run-matching` (501-unconfigured, Bearer, after()-kicked, lock-safe, drains overlay). pgTAP 186/186; advisors = baseline; shadow mode confirmed still OFF. Next: F5 (batch completion: person_links proposed + drain at batch end). |
| 6 | 2026-07-12 | F5 | DONE (LIVE-APPLIED) | Batch completed: proposed person_links per queued pair (never-downgrade), overlay drain at batch end, + fixed the latent CONCURRENTLY-in-function drain bug. Tests 6→9; pgTAP 189/189; live smoked (in-txn drain works, 0 unprocessed). The nightly now runs the full link-not-merge pipeline. Next: F6 ([E2E] re-enable Playwright in CI). |
| 7 | 2026-07-12 | F6 | DONE | **★ e2e GREEN IN CI ★** (PR #3, 4m50s). Re-enabled job + `--with-deps` + build-time NEXT_PUBLIC_* export; branch pushed (-u) + draft PR #3 opened (CI only fires on PRs to main). Fix-forward ×1: F4 route's `force-dynamic` broke the Turbopack build under cacheComponents (build-only rule; local build now part of verification) → removed. All 4 PR checks green. Next: F7 (replace quarantined private-items spec) — the FINAL task. |
| 8 | 2026-07-12 | F7 | DONE | Quarantined Nextbase spec deleted; new `juthoor-owner-flow.spec.ts` (6 lanes + bell, dashboard→tree empty state, Connections lane) — **local 18 passed / 0 skipped**. Fix-forwards: dispatchEvent clicks (sidebar overlap) + empty-state assertions from a live snapshot. **ALL BOARD TASKS DONE — next wakeup: verify CI on the F7 push, write the final summary, mark PR #3 ready, stop.** |
