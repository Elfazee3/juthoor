# Juthoor Fix Loop — State

> Machine-maintained by the fix loop. One task per iteration. Statuses:
> `TODO` · `IN_PROGRESS` · `DONE` · `DONE (LIVE-APPLY PENDING)` · `BLOCKED(reason)`.
> Protocol + acceptance criteria: `docs/FIX_LOOP_BRIEF.md`. Track B detail: `docs/MATCHING_ENGINE_PLAN.md`.

## Environment status (set at S0; re-check when unblocking Track B)

- **Baseline gates (pre-loop, S0, branch `feat/fix-loop-m0-m3`):** `pnpm typecheck` ✅ clean · `pnpm lint` ✅ 0 warnings / 0 errors (278 files) · `pnpm test` ✅ 88 passed (13 files). **This is the green bar every iteration must preserve.**
- **⚠️ Docker Desktop is NOT available this session.** The daemon pipe (`dockerDesktopLinuxEngine`) never became reachable after two launches (~6 min); `com.docker.backend` starts but the Linux VM doesn't reach ready, and `docker info` hangs. In a non-interactive session the Docker Desktop first-run / tray step can't be completed from here.
  - **Consequence:** any task needing the local Supabase stack — all `db` / `[LIVE-APPLY]` / `[E2E]` tasks — cannot be brought up or verified, so cannot be committed under the gate rules (brief §5). Track B is rooted on **B1**, now `BLOCKED`; **A8** (E2E) likewise.
  - **To unblock Track B:** user starts **Docker Desktop** interactively (wait for the tray whale to go green), confirms `docker info` works, then re-runs `/loop`. On that run, reset **B1** and **A8** from `BLOCKED` → `TODO` (the rest of Track B is dependency-gated behind B1 and will become eligible automatically).
  - **Track A non-E2E tasks (A1–A7) need only Node/pnpm** and proceed normally — the loop continues on them.

## Task board (execute in table order, respecting Deps)

| ID | Task | Tags | Deps | Status | Notes |
|----|------|------|------|--------|-------|
| S0 | Bootstrap: create/checkout `feat/fix-loop-m0-m3`; first commit = the untracked planning docs (`docs/MATCHING_ENGINE_PLAN.md`, `docs/FIX_LOOP_BRIEF.md`, `docs/LOOP_STATE.md`); verify Docker + `npx supabase start` + `db reset` + seed villages; record baseline gate results (typecheck/lint/test) | — | — | DONE | Branch ✅, docs committed (d870e0c) ✅, baseline gates ✅ (see Environment status). Docker/supabase verification ✗ — daemon not ready this session (see banner); does not block Track A. |
| A1 | Fix open redirect + silent exchange errors in `auth/callback/route.ts`; encode `next` in `Login.tsx`; unit tests (brief §7-A1) | security | S0 | TODO | |
| A2 | OTP length: accept 6–8 digits client-side, default 8, update SUPABASE_OTP_SETUP.md (brief §7-A2) | auth | S0 | TODO | |
| A3 | Password policy min(8) + bilingual error in `security.ts` (brief §7-A3) | auth | S0 | TODO | |
| B1 | M0: dump + commit ALL live-only DB objects into a migration; fresh `db reset` builds search/degrees end-to-end (brief §8-M0.1, plan §6 "hard dependency") | matching, db | S0 | BLOCKED(env: Docker) | Root of Track B. Needs local Supabase stack (`db reset`) to verify — Docker unavailable this session. Reset to TODO once Docker is up. |
| B2 | M0: replace leaky `matches_select` with admin-only SELECT + pgTAP proving non-admin reads 0 rows (plan §5.4) | security, db, [LIVE-APPLY] | B1 | TODO | |
| B3 | M0: degrees-path masking for living/non-permissioned nodes (SQL + `data/user/degrees.ts` + search UI) + pgTAP (plan §5.1) | security, db, [LIVE-APPLY] | B1 | TODO | |
| B4 | M0: `app_settings` (auto_merge_enabled=false, 450, 0.78) + `matching_runs` + `person_privacy_holds` + `is_person_living()` + pgTAP (plan §7-M0) | matching, db | B1 | TODO | |
| B5 | M0: CI — remove upstream guard from integration-tests.yml only; add pgTAP job; wire `test-db` into turbo (plan §7-M0) | ci | B1 | TODO | |
| B6 | M0: mask living-person birth-year/origin in public-tree search results (plan §5.5) | security | B1 | TODO | |
| A4 | Replace 10 uncached `getUser()` sites with cached claims/verified helpers per guide; ≤1 auth round-trip per page (brief §7-A4) | auth, perf | A1 | TODO | |
| A5 | Extract single `requireAdmin()` helper; migrate both duplicate call sites (brief §7-A5) | auth | A4 | TODO | |
| A6 | Delete dead auth code (signUpAction, magic-link action, NewLogin.tsx, getSession helper); fix middleware doc drift (brief §7-A6) | cleanup | A4 | TODO | |
| A7 | Sanitize server-action error messages (bilingual mapper, no raw Supabase internals) (brief §7-A7) | auth | A1 | TODO | |
| B7 | M1: `match_features` + `match_features_dirty` (deny-all RLS) + derivation triggers on all six source tables; dirty queue = sole probe source (plan §6/§7-M1) | matching, db | B1, B4 | TODO | |
| B8 | M1: `transliterate_to_arabic` ported from `lib/search/phonetic.ts` + `name_variants` seed (plan §6) | matching, db | B1 | TODO | |
| B9 | M1: helpers (`name_score`, `year_band_pts`, `cluster_gate`) + authoritative `score_pair` with collapse/cluster-gate/disagreement-vetoes/score_pct + PII-minimized breakdown (plan §4) | matching, db | B7, B8 | TODO | |
| B10 | M1: synthetic eval fixtures (incl. cross-script pair, namesake trap, different-spouse veto) + pgTAP `match_engine_test.sql` + Vitest parity incl. U/X `resolveParents` cases; recall floors wired into CI (plan §7-M1 exit) | matching, test | B9, B5 | TODO | |
| B11 | M2: `match_block_keys` + `match_block_skips` + 7 blocking passes + non-name anchor pass + `generate_match_candidates` with caps (plan §7-M2) | matching, db | B7 | TODO | |
| B12 | M2: `run_matching_batch` (advisory lock, chunked, timeout-0, shadow-forced pending, never clobber human decisions) + pg_cron schedules (guarded) (plan §7-M2) | matching, db | B9, B11 | TODO | |
| B13 | M2: eval schema + `run_eval` + baseline PR curve on fixtures; `matching_runs` counters verified (plan §7-M2 exit) | matching, db | B9, B10 | TODO | |
| A8 | Revive Playwright: rewrite helpers (password login + Inbucket OTP), fix 4 stale specs, add redirect/gate/admin specs; suite green locally (brief §7-A8) | auth, [E2E] | A1, A2, A5 | BLOCKED(env: Docker) | E2E needs local Supabase stack (Inbucket + DB) — Docker unavailable this session. Code deps (A1/A2/A5) will complete; reset to TODO once Docker is up. |
| B14 | M3: `match_audit`, `notifications`, `contact_relay`, `match_hints`, `match_review_cards` view (masked), `person_identity_groups` matview + unique index, `v_match_explanations` (plan §7-M3) | matching, db | B4, B9 | TODO | |
| B15 | M3: `confirm/reject/revoke_person_link` + `resolve_match` + `resolve_match_hint` RPCs; revoke = full teardown (plan §6 RPCs) | matching, db | B14 | TODO | |
| B16 | M3: `data/admin/review.ts` + `/admin/review` queue UI (RTL A-right, agree/disagree/missing chips, live re-derive via score_pair, living badges) using `requireAdmin` (plan §7-M3) | matching, ui | B14, B15, A5 | TODO | |
| B17 | M3: `data/user/hints.ts` + `/dashboard/connections` (6th DiscoveryTabs lane, masked cards, privacy-hold action) (plan §7-M3) | matching, ui | B14, B15 | TODO | |
| B18 | M3: NotificationBell + in-app notifications wiring (NO email per decision #6) (plan §7-M3) | matching, ui | B14 | TODO | |
| B19 | M3: `compute_degrees` same_as zero-cost hop under §5.1 masking + `match_paths` relation marker + revoke re-isolation test (plan §7-M3 exit) | matching, db | B15 | TODO | |
| B20 | M3: E2E — admin Merge/Reject/Defer, owner Accept/Reject, hostile-counterpart worst case, privacy-hold veto (plan §7-M3 exit) | matching, [E2E] | B16, B17, A8 | TODO | |

## Live-apply ledger

_Migrations applied to the live project (ref `nlufpicjdeeqcgepewdg`) get a row here: migration file · when · advisor check result. Tasks finished locally but not applied stay `DONE (LIVE-APPLY PENDING)` with the exact command._

| Migration | Applied | Advisors |
|---|---|---|

## Iteration log

| # | Date | Task | Result | Note |
|---|------|------|--------|------|
| 1 | 2026-07-10 | S0 | DONE | Branch `feat/fix-loop-m0-m3` created; planning docs committed (d870e0c); baseline gates green (typecheck/lint/88 tests). Docker Desktop wouldn't reach ready after 2 launches → B1 + A8 BLOCKED(env: Docker); Track A (A1–A7) proceeds. |

## Final summary

_(written by the loop when every task is DONE or BLOCKED)_
