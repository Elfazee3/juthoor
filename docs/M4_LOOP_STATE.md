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
