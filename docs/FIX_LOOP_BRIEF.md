# Juthoor Fix Loop — Mission Brief

> **You are the autonomous fix loop for Juthoor** (Palestinian Roots Platform).
> Repo: this monorepo (`apps/web` = Next.js 16 + Supabase, `apps/database` = migrations/pgTAP).
> Your job: work through `docs/LOOP_STATE.md` one task per iteration until every task is
> **DONE** or **BLOCKED**. You never ask the user questions mid-run — every decision you
> need is recorded in this brief. If something is genuinely undecidable, mark the task
> BLOCKED with a precise note and move to the next task.

Two tracks:

- **Track A — Authentication hardening.** Fix the concrete bugs found in the 2026-07-10
  auth audit (open redirect, silent auth errors, OTP length fragility, weak passwords,
  uncached auth calls, dead code, stale E2E).
- **Track B — Matching Engine, phases M0 → M3.** Implement `docs/MATCHING_ENGINE_PLAN.md`
  exactly. That plan is the single source of truth for Track B — this brief only sequences
  it and records the founder decisions. When this brief and the plan disagree, the plan wins.

---

## 1. Founder decisions (recorded — do NOT re-ask)

The founder approved the plan's §2 recommendations by launching this loop:

1. **A — Deterministic FRS scorecard for v1.** No Splink/Python in v1.
2. **B — LINK, never destructively merge.** `person_links` + reversible `same_as` edges.
3. **C — SHADOW MODE.** `app_settings.auto_merge_enabled = false`. **You must never set it
   to true.** Flipping it is a human decision after ≥4 weeks of shadow labels (Phase M4 —
   out of scope for this loop).
4. Living↔living matches: **admin-only, zero owner notification, zero detail**
   (`meta.privacy:'living_suppressed'`). Not suppressed-entirely.
5. Cross-tree fuse requires both owners or an admin; hostile-counterpart model as per plan §5.3.
6. **Email transport deferred.** In-app `notifications` only for v1 — do NOT add Resend or
   any new secret. Build `notify-match` Edge Function only as a stub or skip it.
7. Destructive merge (Phase E+): **not on the roadmap.** Do not build it.
8. Threshold 450 = surfacing hypothesis only; auto-link threshold comes from the M4 PR
   curve (out of scope). Kill-switch ownership: founder.

## 2. Hard guardrails (violating any of these = stop and mark BLOCKED)

1. **Git:** work only on branch `feat/fix-loop-m0-m3` (create from `main` if absent).
   Commit every green iteration (conventional commits: `feat:`/`fix:`/`test:`/`chore:`).
   You may push the feature branch to origin. **Never commit or merge to `main`, never
   force-push, never touch `deploy/*` branches** (deploy.yml runs on pushes — deploys are
   the user's job).
2. **Live database (project ref `nlufpicjdeeqcgepewdg`):**
   - Read-only introspection is always allowed (`pg_get_functiondef`, catalog queries).
   - Applying a migration to LIVE is allowed **only** for tasks tagged `[LIVE-APPLY]` in
     LOOP_STATE.md, and only after that migration passed the full local DB gate (§5).
   - **Never** run destructive SQL on live (no DROP TABLE with data, DELETE, TRUNCATE,
     UPDATE of user rows). Additive DDL + `CREATE OR REPLACE FUNCTION` + policy swaps only.
   - Never insert synthetic/test fixture data into the live DB. Fixtures are local-only
     (migrations under a test path or seed files used by pgTAP).
   - If the Supabase MCP tools error with permission problems (a known gotcha), fall back
     to `npx supabase link --project-ref nlufpicjdeeqcgepewdg` + `npx supabase db push`.
     If that also fails (needs a DB password you don't have), finish the migration + tests
     locally, commit, and mark the task `DONE (LIVE-APPLY PENDING)` with the exact command
     the user must run.
3. **Secrets:** never hardcode any key/token. Never print env values into files or logs.
4. **Safety invariants (from the plan):** every new table gets RLS (deny-all for
   engine-internal tables); every new SECURITY DEFINER function gets `SET search_path = ''`
   and schema-qualified references; `get_advisors(security)` must stay clean after each
   `[LIVE-APPLY]`; shadow mode forces `status='pending'` for all matches; living-person
   rules of plan §5 are non-negotiable.
5. **Never delete or rewrite** `docs/MATCHING_ENGINE_PLAN.md`, `PROGRESS.md`, or this brief.
6. **UI work** must be bilingual AR/EN, RTL-first, and reuse existing patterns (sidebar,
   DiscoveryTabs, requests inbox at `/dashboard/requests` is the fork-model for review UIs).

## 3. Known environment traps (learned the hard way — respect these)

- **Hosted Supabase sends 8-digit OTP codes**; local supabase templates default to 6.
  Any OTP client logic must accept 6–8 digits (`/^\d{6,8}$/`) — never hard-block on length.
- **Free-tier SMTP = 3 emails/hour** on the live project. Never E2E-test OTP against live;
  locally use Inbucket (`http://localhost:54324`) which captures all mail.
- **zod v4 + @hookform/resolvers v5** is the working pairing in this repo — do not
  downgrade either. Watch the `''` vs `optional()` trap in form schemas: empty string is
  not undefined; use explicit transforms where the current forms do.
- **relatives-tree** requires `placeholders: true`; person-add flows go through
  `addRelativeAction` patterns — mirror existing usage in `apps/web/src`.
- **Types drift:** after ANY migration lands (local or live), regenerate DB types
  (`pnpm gen-types-local` against the local stack, or `cd apps/web && pnpm generate:types:local`)
  and commit the regenerated file. Type errors after a migration usually mean you forgot this.
- **Migrations history drift:** the live DB has ~18 applied migrations but the repo has 14
  files. `supabase db push` may complain about history mismatch — if it does, prefer
  MCP `apply_migration`, or use `npx supabase migration repair` ONLY in `--status applied`
  form (never revert), and record exactly what you ran in the iteration log.
- **Next 16:** middleware lives at `apps/web/src/proxy.ts` (not `middleware.ts`).
  Cache Components dev warnings are known noise.
- QA account + demo users: `demo@juthoor.test` / `stranger@juthoor.test` (password login,
  fixtures in `e2e/`). Local signup auto-confirms (see RUN_GUIDE.md §2).

## 4. Environment & commands

- Node 22+, pnpm 9, Docker Desktop (needed for the local Supabase stack).
- Start stack: `cd apps/database && npx supabase start` (first run pulls images).
  Seed villages if fresh: see RUN_GUIDE.md §1.
- Local DB rebuild from migrations: `cd apps/database && npx supabase db reset`
  (this is the "schema builds from scratch" check that M0 requires; seed per RUN_GUIDE).
- pgTAP: `cd apps/database && npx supabase test db` (tests live in
  `apps/database/supabase/tests/`).
- Web app: `pnpm typecheck` · `pnpm lint` · `pnpm test` (vitest) — run from repo root
  (turbo) — and `pnpm --filter web test:e2e` (Playwright; needs local stack + `pnpm dev`
  or Playwright's webServer config).
- Types: `pnpm gen-types-local` (local) / `pnpm gen-types` (linked).
- Dev server: `pnpm web#dev` → http://localhost:3000.

## 5. Verification gates (every iteration, on everything you touched)

| Gate | Command | When |
|---|---|---|
| Types | `pnpm typecheck` | always |
| Lint | `pnpm lint` | always |
| Unit | `pnpm test` | always |
| DB rebuild | `npx supabase db reset` (apps/database) | any migration touched |
| pgTAP | `npx supabase test db` (apps/database) | any migration/SQL touched |
| E2E | `pnpm --filter web test:e2e` | only tasks tagged `[E2E]` |
| Advisors | `get_advisors(security)` via Supabase MCP | after any `[LIVE-APPLY]` |

**Red gates = no commit.** Fix forward up to 3 focused attempts; if still red, `git restore`
the task's changes, mark the task `BLOCKED(<one-line diagnosis>)` in LOOP_STATE.md, commit
only the state-file update, and move on. Never mark a task DONE with a failing gate, and
never weaken/delete an existing test to get green (fix the code, or if the test itself is
provably stale — like the Nextbase-era E2E specs — updating it IS the task, say so in the log).

## 6. Iteration protocol (execute exactly this, once per iteration)

0. **Preflight:** `git status` — you must be on `feat/fix-loop-m0-m3` with a clean tree
   (create/checkout it if needed; on the very first run the three planning docs are
   untracked — S0 commits them; if the tree is dirty from a crashed iteration, inspect,
   then either finish that task's gates or `git restore` and log it).
1. **Read state:** open `docs/LOOP_STATE.md`. If every task is DONE or BLOCKED → write the
   final summary section at the bottom of LOOP_STATE.md, commit, tell the user the loop is
   complete (list DONE/BLOCKED counts and any `LIVE-APPLY PENDING` commands), and **end the
   loop** (if running under /loop, stop scheduling further iterations).
2. **Pick ONE task:** the first task in table order whose status is TODO and whose `Deps`
   are all DONE. Set it `IN_PROGRESS`.
3. **Re-read the source of truth** for that task: the file:line refs in the task row, and
   for Track B the referenced section of `docs/MATCHING_ENGINE_PLAN.md`. Do not implement
   from memory of the plan — re-read the section.
4. **Implement** the smallest complete unit that satisfies the task's acceptance criteria.
   Follow existing code style; small files; immutable patterns; comprehensive error handling.
5. **Run the gates** (§5). Iterate until green (or BLOCKED per §5).
6. **Commit** code + updated LOOP_STATE.md in one commit: `<type>: <task-id> <summary>`.
7. **Log:** append one line to the Iteration Log in LOOP_STATE.md (inside the same commit):
   `| <n> | <date> | <task-id> | <result> | <one-line note> |`.
8. **Stop** this iteration. (Under `/loop` the next firing continues; in a single
   autonomous session, loop straight back to step 0 without waiting.)

**Context hygiene:** each iteration is self-contained — everything future-you needs must be
in LOOP_STATE.md notes or commit messages, not in conversation memory.

## 7. Track A — Authentication (audit findings of 2026-07-10)

Fix these exactly; file:line refs verified against the current tree.

- **A1 — Open redirect + silent error in OAuth/email callback.**
  `apps/web/src/app/(auth-pages)/auth/callback/route.ts:32-51`: `next` is decoded and passed
  to `new URL(decodedNext, origin)` with no same-origin guard → `?next=https://evil.com`
  redirects off-site, reachable unauthenticated. Mirror the guard in
  `auth/confirm/route.ts:15` (`startsWith('/')`, and also reject `//` protocol-relative);
  fallback `/dashboard`. Same guard for the error path. And: `exchangeCodeForSession`
  failures currently `console.error` + redirect to dashboard anyway — route them to
  `/auth/auth-code-error` instead, no console.log/error left behind.
  Also `login/Login.tsx:47`: `next` interpolated into the callback URL without
  `encodeURIComponent` — encode it. **Acceptance:** unit tests for the sanitizer
  (`/dash` ok; `https://evil.com`, `//evil.com`, `javascript:` → `/dashboard`); error path
  lands on auth-code-error.
- **A2 — OTP length fragility.** `apps/web/src/lib/auth/otpConfig.ts:12-15` defaults
  OTP_LENGTH to 6 but hosted sends 8; `Signup.tsx:244` and
  `components/Auth/LoginOtpTab.tsx:131` hard-disable verify unless
  `code.length === OTP_LENGTH`. Make the client accept any 6–8 digit code (server schema
  `auth.ts:175` already `^\d{6,8}$`), render sensibly for both, default the env to 8 (hosted
  reality), and update `SUPABASE_OTP_SETUP.md`'s "length 6" advice to match. **Acceptance:**
  with env unset, an 8-digit code can be submitted; with 6 configured, a 6-digit code can;
  unit test the gate logic.
- **A3 — Password policy.** `apps/web/src/data/user/security.ts:7` allows `min(4)` →
  raise to `min(8)` with a bilingual error message consistent with existing form copy.
  **Acceptance:** unit test; UI shows friendly AR/EN error.
- **A4 — Uncached `getUser()` sprawl.** Ten direct, uncached network-verified calls:
  `data/user/degrees.ts:25`, `attachments.ts:98`, `places.ts:157`, `access.ts:125`,
  `personProfiles.ts:53`, `identityVerification.ts:47,71,95,112`,
  `app/(app-pages)/tree/[treeId]/person/[personId]/page.tsx:34`,
  `app/(app-pages)/admin/verifications/page.tsx:12`. Per
  `docs/SUPABASE_GETCLAIMS_AUTHENTICATION.md`: middleware keeps `getUser()`; plain
  "who is the user" reads switch to the cached claims helpers in `rsc-data/supabase.ts`
  (or `cache()`-wrap a verified-user helper for the security-critical ones — admin checks
  and password change stay server-verified per the guide's "don't trust claims for admin").
  **Acceptance:** one person-360 page render performs ≤1 auth network round-trip;
  typecheck/tests green; admin + password paths still use server-verified user.
- **A5 — Single `requireAdmin()`.** Admin logic duplicated at
  `admin/verifications/page.tsx:10-21` and `data/user/identityVerification.ts:109-124`.
  Extract one server helper (server-verified user + `profiles.is_admin`), reuse in both,
  and use it for all Track B admin surfaces (`/admin/review`). **Acceptance:** one
  implementation, both call sites migrated, non-admin gets 404/notFound as today.
- **A6 — Dead code + doc drift.** Delete unused `signUpAction` (auth.ts:20-38),
  `signInWithMagicLinkAction` (auth.ts:81-101), `login/NewLogin.tsx`,
  `getCachedLoggedInSupabaseUser` (getSession-based, `rsc-data/supabase.ts:18-28`).
  Update `docs/SUPABASE_GETCLAIMS_AUTHENTICATION.md` middleware section to describe the
  real `proxy.ts` default-deny allowlist. **Acceptance:** typecheck/lint green, no imports broken.
- **A7 — Error-message hygiene.** `lib/safe-action.ts:10-12` returns raw Supabase error
  messages to the client. Map known auth errors to bilingual friendly messages; log detail
  server-side; generic fallback otherwise. **Acceptance:** unit test the mapper; wrong OTP
  still shows its specific friendly message (existing UX preserved).
- **A8 — `[E2E]` Revive the Playwright suite.** All auth specs assert the Nextbase starter
  UI and the removed Magic Link tab; `e2e/_helpers/signup.helper.ts` + `login-user.helper.ts`
  block every authenticated test. Rewrite helpers for the current UI (password login for the
  logged-in project; OTP signup spec reading the code from Inbucket at localhost:54324);
  update the 4 stale specs (`e2e/anon/public-pages.spec.ts`, `e2e/anon/access-to-pages.spec.ts`,
  `e2e/user/access-to-pages.spec.ts`, + setup) to Juthoor's real bilingual UI strings/roles;
  add specs for: login next-redirect sanitizer, protected-route gate, admin gate (non-admin
  → 404). **Acceptance:** `pnpm --filter web test:e2e` green locally against the local stack.

## 8. Track B — Matching Engine M0 → M3

The task list in LOOP_STATE.md maps 1:1 to `docs/MATCHING_ENGINE_PLAN.md` §7's phases and
§6's object inventory. Non-negotiables while implementing:

- **M0 first, in order** — it closes two live security holes and makes the schema buildable:
  1. Dump + commit ALL live-only objects (`normalize_arabic`, `arabic_phonetic` + generated
     columns, `search_master_tree`, `compute_degrees`, `match_paths` + indexes/RLS, and the
     search/access RPC family) into a migration via live introspection
     (`select pg_get_functiondef(oid)…`, `pg_dump --schema-only` equivalent queries).
     Exit: fresh `npx supabase db reset` builds everything; app search works locally.
  2. Replace leaky `matches_select` (`migrations/20260416120001_juthoor_rls_policies.sql:388-398`)
     with admin-only SELECT `[LIVE-APPLY]`. pgTAP: non-admin reads 0 rows.
  3. Degrees-path masking per plan §5.1 `[LIVE-APPLY]` + harden `data/user/degrees.ts` /
     search page so masked nodes render as "فردٌ على المسار / Hidden relative".
     pgTAP: non-permissioned viewer through a living person gets a redacted path.
  4. `app_settings` (auto_merge_enabled=false, threshold 450, score_pct_floor 0.78),
     `matching_runs`, `person_privacy_holds`, `is_person_living()` (fails toward living).
  5. CI: remove the upstream-repo guard (`.github/workflows/integration-tests.yml:19` — the
     same guard also sits in release/update-dependencies/version-packages; touch ONLY
     integration-tests), add a pgTAP job (`supabase start` + `supabase test db`), wire
     `test-db` into turbo. Exit: workflow YAML is valid (verify with a YAML parse) and the
     pgTAP suite passes locally exactly as CI would run it.
  6. Companion leak: mask living-person birth-year/origin in public-tree search results
     (plan §5.5).
- **M1:** feature layer + the single authoritative `score_pair` with collapse, cluster gate,
  disagreement vetoes, `score_pct` over clusters; `transliterate_to_arabic` ported from
  `apps/web/src/lib/search/phonetic.ts` (`toArabic`/`toArabicSync`, FALLBACK table);
  parity with `lib/tree/relationships.ts` `resolveParents` (module-private — read it at
  line ~95, incl. U/X + same-gender-partner branches); synthetic fixtures incl. the
  cross-script Ibrahim/Abraham pair and the same-village namesake trap; pgTAP + Vitest.
- **M2:** blocking passes P1–P7 + non-name anchor pass, `generate_match_candidates` with
  caps + skew audit, `run_matching_batch` (advisory lock, chunked, `SET LOCAL
  statement_timeout=0`, shadow-forced pending, ON CONFLICT never clobbers human decisions),
  eval schema + `run_eval` baseline. pg_cron schedules guarded by extension-availability
  check; document the Vercel-cron fallback but per decision #6 do not build email.
- **M3:** review/notification tables + views (`match_review_cards` masked per plan §4/§5,
  `person_identity_groups` matview with unique index), link RPCs (revoke = full teardown),
  `data/admin/review.ts` + `data/user/hints.ts` on `authActionClient` + `requireAdmin` (A5),
  `/admin/review` UI, `/dashboard/connections` (6th DiscoveryTabs lane), NotificationBell,
  `compute_degrees` same_as hop under masking. `[E2E]` on the final task.
- Each phase's **Exit criteria** in the plan are the acceptance criteria — quote them in the
  iteration log when you check them off. Track B tasks tagged `[LIVE-APPLY]` follow §2.2.

## 9. Definition of done for the whole loop

- Every LOOP_STATE.md task DONE (or BLOCKED with a precise unblocking note).
- `pnpm typecheck && pnpm lint && pnpm test` green; pgTAP suite green on a fresh
  `db reset`; E2E green locally.
- Branch `feat/fix-loop-m0-m3` pushed; NO merge to main.
- Final summary written at the bottom of LOOP_STATE.md: what shipped, what's
  `LIVE-APPLY PENDING` (with exact commands), what's blocked and why, and the recommended
  next human steps (review PR, apply pending live migrations, start the 4-week shadow
  period = Phase M4).
