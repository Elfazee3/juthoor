# Juthoor Fix Loop — State

> Machine-maintained by the fix loop. One task per iteration. Statuses:
> `TODO` · `IN_PROGRESS` · `DONE` · `DONE (LIVE-APPLY PENDING)` · `BLOCKED(reason)`.
> Protocol + acceptance criteria: `docs/FIX_LOOP_BRIEF.md`. Track B detail: `docs/MATCHING_ENGINE_PLAN.md`.

## Environment status (set at S0; re-check when unblocking Track B)

- **Baseline gates (pre-loop, S0, branch `feat/fix-loop-m0-m3`):** `pnpm typecheck` ✅ clean · `pnpm lint` ✅ 0 warnings / 0 errors (278 files) · `pnpm test` ✅ 88 passed (13 files). **This is the green bar every iteration must preserve.**
- **✅ Docker Desktop came up (~50 min after launch) — local stack now available.** `docker info` → server 29.1.3. Track A (S0, A1–A7) was completed while it booted; **B1 and A8 are now unblocked (reset to TODO)** and the loop continues into Track B.
- **✅ Live Supabase access confirmed via MCP** — project `nlufpicjdeeqcgepewdg` (juthoor), ACTIVE_HEALTHY, **Postgres 17**. `execute_sql` reads the live-only objects, so B1 can introspect and dump them (`pg_get_functiondef` / table DDL). This is read-only on live; B1 writes migration files + verifies with a local `db reset` (no live mutation).
  - **B1 hand-off notes (verified live 2026-07-10):** live-only objects = FUNCTIONS `normalize_arabic(txt text)`, `arabic_phonetic(txt text)`, `search_master_tree(...)` — **its args use a `gender_type` enum; confirm that enum is committed/local before building** — and `compute_degrees(p_source uuid, p_target uuid)`; PLUS the `match_paths` **cache TABLE** (+ its indexes/RLS) — `match_paths` is a table, not a function. Also check `person_names` for generated phonetic columns.
  - **⚠️ Version mismatch:** live is **Postgres 17**; local `apps/database/supabase/config.toml` is `major_version = 15`. Bump the local config to 17 (or verify the dumped objects build on 15) before the "`db reset` builds from scratch" acceptance check.
- **Baseline green bar to preserve:** typecheck clean · lint 0/0 · 111 unit tests (was 88 at S0; Track A added 23).

## Task board (execute in table order, respecting Deps)

| ID | Task | Tags | Deps | Status | Notes |
|----|------|------|------|--------|-------|
| S0 | Bootstrap: create/checkout `feat/fix-loop-m0-m3`; first commit = the untracked planning docs (`docs/MATCHING_ENGINE_PLAN.md`, `docs/FIX_LOOP_BRIEF.md`, `docs/LOOP_STATE.md`); verify Docker + `npx supabase start` + `db reset` + seed villages; record baseline gate results (typecheck/lint/test) | — | — | DONE | Branch ✅, docs committed (d870e0c) ✅, baseline gates ✅ (see Environment status). Docker/supabase verification ✗ — daemon not ready this session (see banner); does not block Track A. |
| A1 | Fix open redirect + silent exchange errors in `auth/callback/route.ts`; encode `next` in `Login.tsx`; unit tests (brief §7-A1) | security | S0 | DONE | New `lib/auth/safeRedirect.ts` sanitizer (rejects off-origin, `//host`, `/\`, control chars, bad encoding) wired into callback + confirm routes; callback now routes exchange failures to `/auth/auth-code-error` (no console); `Login.tsx` encodes `next`. 8 unit tests. Gates green. |
| A2 | OTP length: accept 6–8 digits client-side, default 8, update SUPABASE_OTP_SETUP.md (brief §7-A2) | auth | S0 | DONE | `otpConfig.ts` defaults to 8 + adds `OTP_MIN/MAX_LENGTH` and `isValidOtp()`; both submit gates (Signup, LoginOtpTab) now use `isValidOtp` (accepts 6–8) instead of exact-length; stale comments fixed; +5 unit tests. SUPABASE_OTP_SETUP.md advice corrected in place (NOTE: that doc is at the ancestry root, outside the juthoor repo — updated but not in the commit). Gates green (101 tests). |
| A3 | Password policy min(8) + bilingual error in `security.ts` (brief §7-A3) | auth | S0 | DONE | New reusable `lib/auth/passwordPolicy.ts` (min 8 + bilingual AR·EN message); `security.ts` update-password schema uses it; `UpdatePassword.tsx` onError now surfaces the validation message (not just serverError). +3 unit tests. Existing logins not re-validated → no lockout. Gates green (104 tests). |
| B1 | M0: dump + commit ALL live-only DB objects into a migration; fresh `db reset` builds search/degrees end-to-end (brief §8-M0.1, plan §6 "hard dependency") | matching, db | S0 | DUMP DONE / VERIFY BLOCKED(env: Docker) | DUMP COMPLETE + committed (16 live-only schema migrations, byte-exact vs live `schema_migrations`; 13 via subagent + 3 search_master_tree recovered this session). REMAINING = ONLY the `db reset` build-check: Docker Desktop would not reach ready (timed out after ~37 min; 3rd failure across sessions). To finish B1: get Docker stable, then `cd apps/database && npx supabase start && npx supabase db reset` — fix any ordering/dep errors, bump config `major_version` 15→17 if a version error appears, then mark DONE. Villages load via `seed_villages.sql`; the 2 nakba_villages_seed migrations are intentionally NOT re-added. |
| B2 | M0: replace leaky `matches_select` with admin-only SELECT + pgTAP proving non-admin reads 0 rows (plan §5.4) | security, db, [LIVE-APPLY] | B1 | TODO | |
| B3 | M0: degrees-path masking for living/non-permissioned nodes (SQL + `data/user/degrees.ts` + search UI) + pgTAP (plan §5.1) | security, db, [LIVE-APPLY] | B1 | TODO | |
| B4 | M0: `app_settings` (auto_merge_enabled=false, 450, 0.78) + `matching_runs` + `person_privacy_holds` + `is_person_living()` + pgTAP (plan §7-M0) | matching, db | B1 | TODO | |
| B5 | M0: CI — remove upstream guard from integration-tests.yml only; add pgTAP job; wire `test-db` into turbo (plan §7-M0) | ci | B1 | TODO | |
| B6 | M0: mask living-person birth-year/origin in public-tree search results (plan §5.5) | security | B1 | TODO | |
| A4 | Replace 10 uncached `getUser()` sites with cached claims/verified helpers per guide; ≤1 auth round-trip per page (brief §7-A4) | auth, perf | A1 | DONE | Added `getCachedLoggedInUserIdOrNull` helper; 8 uid-only reads (degrees, attachments, places, access, personProfiles, identityVerification ×3, person-360 page) now use cached claims (0 network); 2 admin sites (assertAdmin, admin page) use cached VERIFIED helper (still server-verified, now deduped). Only middleware + the verified helper still call getUser. Person-360 render now does 0 auth round-trips. Gates green (104 tests). |
| A5 | Extract single `requireAdmin()` helper; migrate both duplicate call sites (brief §7-A5) | auth | A4 | DONE | New `data/admin/requireAdmin.ts` (cached `getAdminUserId` + `requireAdmin` + `isCurrentUserAdmin`, server-verified). Removed local `assertAdmin` (identityVerification.ts) and `isCurrentUserAdmin` (admin page); both migrated. Admin page guard + data fetch now share one cached is_admin lookup. Ready for Track B `/admin/review`. Gates green (104 tests). |
| A6 | Delete dead auth code (signUpAction, magic-link action, NewLogin.tsx, getSession helper); fix middleware doc drift (brief §7-A6) | cleanup | A4 | DONE | Verified all 4 symbols unused (grep), then removed: `signUpAction` + `signInWithMagicLinkAction` (auth.ts), `getCachedLoggedInSupabaseUser` (rsc-data), `NewLogin.tsx` (git rm). Fixed SUPABASE_GETCLAIMS doc middleware section → real proxy.ts default-deny allowlist (was stale protectedPages/path-to-regexp). Gates green (104 tests). |
| A7 | Sanitize server-action error messages (bilingual mapper, no raw Supabase internals) (brief §7-A7) | auth | A1 | DONE | New `lib/auth/authErrors.ts` `friendlyAuthError()` maps known auth failures (OTP, credentials, rate-limit, duplicate, auth-required, weak-pw) to bilingual messages; unknown → generic (no leak). `safe-action.ts` logs raw error server-side, returns friendly message. Wrong-OTP UX preserved. +7 unit tests. Gates green (111 tests). |
| B7 | M1: `match_features` + `match_features_dirty` (deny-all RLS) + derivation triggers on all six source tables; dirty queue = sole probe source (plan §6/§7-M1) | matching, db | B1, B4 | TODO | |
| B8 | M1: `transliterate_to_arabic` ported from `lib/search/phonetic.ts` + `name_variants` seed (plan §6) | matching, db | B1 | TODO | |
| B9 | M1: helpers (`name_score`, `year_band_pts`, `cluster_gate`) + authoritative `score_pair` with collapse/cluster-gate/disagreement-vetoes/score_pct + PII-minimized breakdown (plan §4) | matching, db | B7, B8 | TODO | |
| B10 | M1: synthetic eval fixtures (incl. cross-script pair, namesake trap, different-spouse veto) + pgTAP `match_engine_test.sql` + Vitest parity incl. U/X `resolveParents` cases; recall floors wired into CI (plan §7-M1 exit) | matching, test | B9, B5 | TODO | |
| B11 | M2: `match_block_keys` + `match_block_skips` + 7 blocking passes + non-name anchor pass + `generate_match_candidates` with caps (plan §7-M2) | matching, db | B7 | TODO | |
| B12 | M2: `run_matching_batch` (advisory lock, chunked, timeout-0, shadow-forced pending, never clobber human decisions) + pg_cron schedules (guarded) (plan §7-M2) | matching, db | B9, B11 | TODO | |
| B13 | M2: eval schema + `run_eval` + baseline PR curve on fixtures; `matching_runs` counters verified (plan §7-M2 exit) | matching, db | B9, B10 | TODO | |
| A8 | Revive Playwright: rewrite helpers (password login + Inbucket OTP), fix 4 stale specs, add redirect/gate/admin specs; suite green locally (brief §7-A8) | auth, [E2E] | A1, A2, A5 | BLOCKED(serialize behind B1) | Deps DONE, but E2E shares the single local Supabase stack that B1's `db reset` loop is using — reset to TODO once B1 is DONE to avoid stack contention. |
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
| 2 | 2026-07-10 | A1 | DONE | Open-redirect + silent-error fix. Added `lib/auth/safeRedirect.ts` (+8 vitest cases), wired into callback + confirm routes, callback→auth-code-error on failure, encoded `next` in Login.tsx. Gates: typecheck ✅ · lint 0/0 (280) ✅ · test 96 passed ✅. |
| 3 | 2026-07-10 | A2 | DONE | OTP length fragility. `otpConfig.ts` default 8 + `isValidOtp()`; Signup + LoginOtpTab gates accept 6–8 digits; setup-doc advice corrected (out-of-repo, not committed). Gates: typecheck ✅ · lint 0/0 ✅ · test 101 passed ✅. |
| 4 | 2026-07-10 | A3 | DONE | Password policy. New `lib/auth/passwordPolicy.ts` (min 8, bilingual msg); `security.ts` uses it; `UpdatePassword.tsx` surfaces validation message. +3 tests. Gates: typecheck ✅ · lint 0/0 ✅ · test 104 passed ✅. |
| 5 | 2026-07-10 | A4 | DONE | getUser() caching. New `getCachedLoggedInUserIdOrNull`; 8 uid reads → cached claims (0 network), 2 admin → cached verified helper. Only middleware + verified helper still hit getUser. Person-360 render: 0 auth round-trips. Gates: typecheck ✅ · lint 0/0 ✅ · test 104 ✅. |
| 6 | 2026-07-10 | A5 | DONE | requireAdmin extraction. New `data/admin/requireAdmin.ts` (getAdminUserId/requireAdmin/isCurrentUserAdmin, cached+server-verified); removed duplicated assertAdmin + isCurrentUserAdmin; both call sites migrated. Gates: typecheck ✅ · lint 0/0 ✅ · test 104 ✅. |
| 7 | 2026-07-10 | A6 | DONE | Dead-code + doc drift. Removed signUpAction, signInWithMagicLinkAction, getCachedLoggedInSupabaseUser, NewLogin.tsx; fixed middleware doc (proxy.ts default-deny allowlist). Gates: typecheck ✅ · lint 0/0 ✅ · test 104 ✅. |
| 8 | 2026-07-10 | A7 | DONE | Error-message hygiene. New `lib/auth/authErrors.ts` friendlyAuthError (bilingual, generic fallback); safe-action.ts logs raw + returns friendly. +7 tests. Gates: typecheck ✅ · lint 0/0 ✅ · test 111 passed ✅. |
| 9 | 2026-07-10 | env | CONTINUE | Docker came up (server 29.1.3) + live Supabase MCP access confirmed (PG17, execute_sql reads live objects). B1 + A8 reset BLOCKED→TODO. Track A complete (S0, A1–A7); loop continues into Track B, B1 next. |
| 10 | 2026-07-11 | B1 | DUMP DONE (verify pending) | Background subagent wrote 13/16 migration files before a session restart stopped it; recovered the 3 missing search_master_tree migrations (byte-exact vs live) this session. All 16 committed. `db reset` verification blocked: Docker down post-restart, relaunched & booting. |

## Progress summary

**Session 1 (2026-07-10) — Track A (auth) complete; Docker + live DB came up mid-session, loop continuing into Track B.**

### Shipped (branch `feat/fix-loop-m0-m3`, 8 commits, all gates green — 111 unit tests)
- **S0** bootstrap: branch + planning docs + baseline recorded.
- **A1** — closed the unauthenticated **open redirect** in the OAuth callback (+ silent-error swallow); shared `sanitizeNextPath` guards both auth routes; `next` encoded in Login. (8 tests)
- **A2** — fixed the **OTP lockout**: client accepts any 6–8 digit code, default length 8. (5 tests)
- **A3** — password policy **min(4)→min(8)** with a bilingual error. (3 tests)
- **A4** — removed **10 uncached `getUser()`** round-trips; person-360 render now does 0 auth round-trips; admin/password stay server-verified.
- **A5** — single **`requireAdmin()`** helper (`data/admin/requireAdmin.ts`); both duplicate admin checks migrated.
- **A6** — deleted **~250 lines of dead auth code** (2 actions, `NewLogin.tsx`, a stale cached helper) + fixed the middleware doc drift.
- **A7** — **error-message hygiene**: `friendlyAuthError` bilingual mapper, no raw Supabase/DB internals reach the client. (7 tests)
- Out-of-repo doc `SUPABASE_OTP_SETUP.md` (ancestry root) updated in place (not committed).

### Environment (updated mid-session)
- **Docker Desktop is now up** (came ready ~50 min after launch) and **live Supabase MCP access is confirmed** (project `nlufpicjdeeqcgepewdg`, PG17). Both of B1's prerequisites are satisfied.
- **No live-DB mutations have occurred** (LIVE-APPLY ledger empty). B1 is read-only on live (introspection) + local file/db-reset.

### Track B — foundation dumped, PAUSED on Docker (2026-07-11)
- **B1 dump is DONE + committed** (16 live-only schema migrations, byte-exact vs live). Only the local `db reset` build-check remains, and **Docker Desktop will not stay up in this environment** — it failed to reach ready 3× across sessions (once after ~50 min it did, then died on restart). This is an environment issue, not a code one.
- **Loop stopped** (can't verify DB work without Docker; A8 E2E and B2–B20 all need the local stack). Not a completion — a clean pause.
- **To resume Track B:** ensure Docker Desktop is running and stable (start it, wait for the tray whale to go green, confirm `docker info` works and stays working), then re-run `/loop`. It will resume at B1's `db reset` verification, then M0 security fixes (B2 RLS admin-only, B3 degrees masking — both `[LIVE-APPLY]`), M0 foundations (B4/B5/B6), M1→M3, and finally A8 E2E.

### Recommended human review any time
- The 9 commits on `feat/fix-loop-m0-m3` so far (S0 + 7 auth fixes) are self-contained and independently valuable. The branch is intentionally **not pushed and not merged to main** by the loop — review/push/PR when satisfied.
