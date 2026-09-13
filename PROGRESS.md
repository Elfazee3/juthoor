# Juthoor — جذور | Project Progress Tracker

> **How to use:** Claude checks boxes `[x]` as each item is completed. Never mark done unless fully built, tested, and committed to GitHub.
>
> **Sources:** This file is derived from:
> - `main/PRD.md` — Product Requirements Document (phases, features, metrics)
> - `Palestinian_Roots_All_in_One_v4.2.docx` — Functional Requirements Specification (exact behaviour, rules, logic, data fields)
> - `docs/LOOP_STATE.md` — detailed task-level log of the auth-hardening + matching-engine build (Tracks A/B, merged to `main` via PR #2)
>
> **Last full audit:** 2026-09-13, against `main` @ `c79a43d` (PR #2 merged). This rewrite reconciles checkboxes with what's actually in the codebase — several items below were stale (marked incomplete when done, or vice versa).

---

## PHASE 0 — Foundation & Planning

### Step 1: Scaffold & Setup
- [x] Clone nextbase-nextjs-supabase-starter as base
- [x] Strip old git history — fresh repo created at `github.com/yossefbouz/juthoor`
- [x] Install pnpm + all dependencies
- [x] Apply Juthoor design tokens (olive, gold, terra, stone palette)
- [x] Apply Arabic fonts — Cairo (UI), Amiri (display), Inter (Latin)
- [x] Set `html lang="ar" dir="rtl"` — Arabic-first from day one
- [x] Update page metadata (title, description, keywords)
- [x] Fix `path-to-regexp` v8 breakage in middleware and proxy
- [x] Fix CSS `@import` order for PostCSS
- [x] Wire real Supabase credentials (`.env.local`)
- [x] Dev server running clean at `localhost:3000`
- [x] All changes pushed to GitHub

---

## PHASE 1 — MVP Build

### Step 2: Supabase Database Schema (GEDCOM 7 Aligned)
- [x] Create `places` table (GEDCOM PLAC — bilingual names, lat/lng, district, depopulated_year)
- [x] Create `trees` table (container for family trees, owner_id, GEDCOM import tracking)
- [x] Create `tree_members` table (access control: owner/collaborator/read_only)
- [x] Create `persons` table (GEDCOM INDI — gender, display_name_ar/en, gedcom_xref)
- [x] Create `person_names` table (GEDCOM NAME — given_name, surname, prefix, suffix, lang ar/en, name_type)
- [x] Create `families` table (GEDCOM FAM — partner1_id, partner2_id, gender-neutral)
- [x] Create `family_children` table (GEDCOM CHIL — child_id, pedigree: birth/adopted/foster)
- [x] Create `events` table (GEDCOM events — BIRT/DEAT/EMIG/MARR/DIV etc. with date + place)
- [x] Create `matches` table (Fellegi-Sunter — confidence_score, status, score_breakdown JSONB)
- [x] Create `profiles` table (extends Supabase Auth — display_name, preferred_language, is_admin)
- [x] Create 6 enum types (gender_type, event_type, name_type, pedigree_type, match_status, tree_role)
- [x] Enable Row Level Security (RLS) on all 10 tables (38 policies total)
- [x] RLS policy: tree owners can read/write their own tree data
- [x] RLS policy: public trees readable by all authenticated users (Master Tree concept)
- [x] RLS policy: admin can manage everything (places, matches, all trees)
- [x] RLS helper functions: is_admin(), can_access_tree(), can_write_tree()
- [x] Auto-create profile on signup trigger
- [x] Auto-update updated_at triggers on 6 tables
- [x] Seed `places` table — grown from the original 263 to **456 depopulated Palestinian villages** (all 14 districts covered) via the matching-engine seed migration
- [x] Verify schema in Supabase Table Editor — all tables + RLS confirmed
- [x] Generate TypeScript types from schema (`apps/web/src/types/database.ts`)
  - ⚠️ **Note:** this file is now **hand-maintained**, not `supabase gen`-generated — running codegen will overwrite and break the app. Extend it by hand when adding DB objects (see B16 note in `docs/LOOP_STATE.md`).

### Step 3: Tree Builder
- [x] "Add Person" form — fields: Arabic name, English name, birth year, death year, village, gender
- [x] Field tooltips on hover (FRS: "hovering over any field shows a pop-up description")
- [x] 360° person view — centre: person name, up: parents, down: children, right: siblings, left: spouse/partner
- [x] Click on any person in 360° view → that person becomes the new centre focus (FRS: Navigation)
- [x] Default surname = father's surname (FRS: auto-inherit) — `lib/tree/inheritance.ts::inheritSurname`, unit-tested
- [x] Default village/origin = father's origin (FRS: auto-inherit) — `lib/tree/inheritance.ts::inheritVillage`, unit-tested
- [x] Female entries use maiden name, not married name (FRS requirement) — `deriveDisplayName`
- [x] If mother is unknown → system inserts placeholder "Female 1" linked as spouse to father (auto-created by `addRelativeAction`)
- [x] When mother details added later → prompt user to link each child to the mother (`UpgradePlaceholderDialog` + affected-children review)
- [ ] Children entry form: tabular with dropdowns for surname, mother name, origin — children are still added one at a time via the add-relative sheet, not a batch table
- [x] Validation: each child must be linked to a mother (FRS rule 11, enforced in `zodSchemas` + server action)
- [x] Multi-spouse validation: if individual married more than once, validate correct mother per child (mother picker in Add form + server check)
- [x] Hover over person name → pop-up summary of that person
- [x] GEDCOM import — parse `.ged` files and populate the tree (uses `parse-gedcom`, 5 MB cap)
- [x] GEDCOM export — download tree as `.ged` file
- [x] Tree rendered visually on screen (relatives-tree layout + custom canvas chart)
- [x] Tree is saved to Supabase in real time

### Step 3.5: Tree UX Overhaul — Ancestry-parity (2026-06-12)
- [x] Atomic add-relative backend, ghost-partner layout fix, ghost-repair on save, chart redesign (pan/zoom/toolbar/connectors), card redesign, "كل الأشخاص" list view, find-in-tree panel, auth hydration hardening — see prior detail; all shipped and unchanged since.

### Step 4: Family Finder
- [x] Search form: filter by Name, Phonetic Name, Surname, Phonetic Surname
- [x] Search form: filter by Date of Birth (± year window), Place of Birth / Origin
- [x] Phonetic search — handles Arabic name variants (via `arabic_phonetic` + `normalize_arabic` Postgres functions, plus a JS↔SQL-parity-tested cross-script transliterator added during the matching-engine build)
- [x] Arabic ↔ English language toggle (LocaleContext)
- [ ] Phonetic conversion table: translates English input → Arabic canonical form — a fallback transliteration fold exists (`transliterate_to_arabic`, 15 rules) built for internal matching use, but there is no reviewed, linguist-vetted **canonical** English→Arabic conversion table as the FRS specifies for general data entry
- [x] Search results from the Master Tree (all connected trees — `search_master_tree` RPC with score breakdown)
- [x] If search finds a match → show "degrees of separation" path between user and matched person (`compute_degrees` + PathGraph, now also traversing confirmed cross-tree matches via a zero-cost hop)
- [x] Proof-of-family upload when requesting Write access to a tree (FRS: Permissions)
- [x] Request access flow: authenticated user requests Read/Write access for a specific tree (request → owner approves/rejects in dashboard)

### Step 5: Matching Engine — **rebuilt from scratch, far exceeds original spec**
> The checklist below (weighted 25-parameter table, hardcoded thresholds) was the *original* plan. What's actually shipped is a full 4-milestone engine (M0→M3, tracked task-by-task in `docs/LOOP_STATE.md`) that supersedes it. Rewriting to reflect reality:

- [x] **M0 — Safety foundation:** reconstructed all live-only DB objects into version-controlled migrations; closed an RLS leak on `matches` (was publicly readable, now admin-only); added degrees-path masking and living-person masking in search results; `app_settings` (incl. `auto_merge_enabled` kill-switch), `matching_runs`, `person_privacy_holds` tables; pgTAP CI job
- [x] **M1 — Feature layer & scorer:** `match_features` + dirty-queue triggers on all source tables; cross-script `transliterate_to_arabic`; `score_pair` — collapse literal/phonetic scoring, evidence-cluster gating, disagreement vetoes (mother/spouse/origin/grandparent/birth-year mismatches block a match), PII-minimized score breakdown; synthetic eval fixtures + JS↔SQL parity tests (caught and fixed a real bug in `phonetic.ts`)
- [x] **M2 — Shadow-mode batch matcher:** blocking/candidate generation (6 passes, cross-tree, privacy-hold excluded), `run_matching_batch` (advisory-locked, never overwrites a human decision), `run_eval` harness (precision/recall/cross-script recall)
- [x] **M3 — Review & resolution surfaces:** `person_links`/`merge_log`, `match_audit`, in-app `notifications`, `match_hints`, masked `match_review_cards` view, `person_identity_groups` ("Mother Tree" overlay, union-find over confirmed links); RPCs `resolve_match` / `resolve_match_hint` / `confirm|reject|revoke_person_link` (revoke = full teardown + re-isolation); admin review queue UI at `/admin/review`; owner "connections" inbox at `/dashboard/connections`; `NotificationBell`
- [x] Daily/batch (not real-time) matching — matches FRS intent, implemented as an on-demand batch RPC rather than a cron job yet (see punch list)
- [x] Admin can resolve: merge, reject, or defer each match (`/admin/review`)
- **Deliberate deviations from the FRS, by design, not oversight:**
  - Auto-merge is **disabled** (`app_settings.auto_merge_enabled = false`) pending a planned observation period — the FRS's "score ≥ threshold auto-merges" behaviour is intentionally not yet switched on for real users
  - A match where either person is **living** is never auto-fused — it's routed to both tree owners for dual consent instead, regardless of score
  - Perfect-match identifiers (UNRWA number, host-country family card) from FRS §3.6 are **not yet implemented** — see Displacement Documentation gap below; the scorer currently runs on demographic fields only

### Step 6: Auth + Access Control
- [x] Email/password signup and login (Supabase Auth)
- [x] OTP login/signup (email code, 6–8 digit accepted, 8-digit default)
- [ ] Magic link login option — **removed**, not just undone: `signInWithMagicLinkAction` and the Magic Link tab were deleted (local dev mail relay sends a malformed magic-link email instead of a clean OTP, so the team dropped the feature rather than fix it — reversal candidate if wanted later)
- [x] Protected routes: tree builder and family finder require login (default-deny middleware allowlist)
- [x] Role system: owner / collaborator / read-only / admin (`tree_role` enum + RLS)
- [x] Admin dashboard: manage match reports, approve/reject tree access requests (`/admin/review`, `/dashboard/requests`)
- [x] Identity verification flow — ID/passport/national-ID/refugee-card upload + admin review (`/verify`, `/admin/verifications`) — beyond original checklist scope but directly serves FRS §3.2 "proof of belonging"

### Step 7: RTL + Bilingual Polish
- [x] Full RTL layout — verified in E2E (Playwright asserts `dir="rtl"` flows); sidebar collapse/overlap bugs found and fixed during matching-engine E2E work
- [x] Language toggle button (AR ↔ EN) — verified working in RELEASE_READINESS.md E2E pass
- [ ] All Arabic UI copy reviewed and approved — no sign-off record found
- [ ] All English UI copy reviewed — no sign-off record found
- [x] Arabic body text uses Cairo font, display headings use Amiri
- [ ] Dark mode tested in both RTL and LTR — not covered by any test or report found
- [x] Mobile responsive layout — sidebar collapses to drawer <768px (RELEASE_READINESS.md); minimum-width target (360px) not explicitly verified

---

## Security & Auth Hardening (Track A — not in the original plan, done as part of the same build)
- [x] Closed an unauthenticated open-redirect in the OAuth callback + silent error swallowing (`lib/auth/safeRedirect.ts`)
- [x] Removed 10 uncached `getUser()` round-trips (cached claims helper) — person-360 page now does 0 auth network calls per render
- [x] Single `requireAdmin()` helper, replacing two duplicated ad-hoc admin checks
- [x] ~250 lines of dead auth code deleted (unused actions, a stale component, a stale helper)
- [x] Bilingual, non-leaking error messages for all auth failures (`friendlyAuthError`)
- [x] Password minimum raised 4→8 chars with a bilingual validation message
- [x] Playwright E2E suite revived and green (10 auth specs + 5 matching specs, 2 intentionally skipped)

## Production Security Migrations — LIVE
- [x] `matches` table RLS leak closed on production (was publicly readable) — **live-applied 2026-07-12, user-authorized**
- [x] Degrees-of-separation path masking — **live**
- [x] Living-person search-result masking (birth year/origin hidden from non-privileged viewers) — **live**
- [x] Anon-role hardening on `is_person_living()` — **live**

---

## PHASE 2 — Growth

- [ ] Tree collaboration — share tree with a family member (invite by email)
- [x] **Village pages** — `/villages` (list) + `/villages/[placeId]` (detail) exist, ahead of schedule; scope vs. the FRS's "every village has a page with all its documented families" not yet verified
- [ ] Document crowdsourcing — upload Ottoman land deeds, UNRWA records, Mandate papers — **partially covered**: per-person document attachments exist (`kind: 'document'`, tags include `land_deed`, `family_card`, `birth_cert`, etc.) but there's no dedicated crowdsourcing/browse surface for these documents independent of a person record
- [ ] Evidence confidence meter per person/event (certain / likely / possible / uncertain)
- [x] In-app notifications for match found / access request / merge completed (`NotificationBell`) — email notifications explicitly deferred (decision: in-app only, no Resend/email wiring yet)
- [x] Mobile responsive improvements (sidebar drawer, RTL card fixes from E2E work)
- [ ] SEO + Arabic search engine optimisation

---

## PHASE 3 — Scale

- [ ] Performance: P95 page load < 2 seconds — search RPC measured <400ms but only against a 9-row test dataset; no test at realistic scale
- [ ] Uptime SLA: 99.9%
- [ ] GDPR / data privacy audit
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] 20,000 MAU target infrastructure review
- [ ] Native iOS app
- [ ] Native Android app

---

## Gap vs. FRS: Displacement Documentation (§5.7 of the FRS) — not started
The FRS treats this as the platform's most important section (1948/1967/1982 displacement records, UNRWA registration, host-country family cards, PA ID/passport, Israeli-issued ID, land/property records, oral history with provenance). None of these are modeled as structured fields in the schema today. Generic document *attachments* can be tagged (`land_deed`, `family_card`, etc.) and linked to a person, but there is no dedicated table, form, or GEDCOM mapping for these fields, and — critically — the two FRS "perfect-match" identifiers (UNRWA number, host-country 1948 family card) that are supposed to override the scoring algorithm are not wired into the matching engine at all yet.

## Gap vs. FRS: Front-End GUI Modules (Appendix 2)
- [x] Module 3.0 (Trees), 4.0 (Individual Search) — built, and exceeded (kinship chips, score breakdown popovers, degrees-of-separation graph)
- [x] Module 5.0 (Family Search) — `/families/[surname]`
- [x] Module 6.0 (Villages/Cities/Clans) — `/villages`
- [~] Module 2.0 (Home Page) — homepage + `/about`, `/why`, `/how`, `/contact` pages all exist, but with different content/structure (hero/manifesto/timeline) than the FRS's literal 2.1–2.4 layout
- [~] Module 7.0 (Picture Gallery) — photo upload/lightbox exists **per person**, not as a browsable cross-tree gallery module
- [ ] Module 8.0 (Document Archive) — no standalone archive/browse UI; documents exist only as per-person attachments

---

## Ongoing / Always Active
- [x] `.env.local` never committed to GitHub (secrets safe)
- [x] All Supabase tables have RLS enabled
- [x] No hardcoded secrets anywhere in codebase
- [ ] TypeScript types kept in sync with Supabase schema after every migration — **process risk:** `types/database.ts` is hand-maintained (see Step 2 note); nothing enforces it staying in sync, and a drift was already found once (`profiles.self_person_id` present live, missing from local migrations — open follow-up, not yet resolved)

---

> **Last updated by Claude:** Full reconciliation against `main` @ `c79a43d` (2026-09-13). Corrected: Tree Builder father-inheritance rules (were unchecked, are done), added the entire Security/Matching-Engine build (Tracks A + B, ~53 commits, merged via PR #2) which wasn't reflected here at all, added GUI-module gap tracking, and flagged the Displacement Documentation section (FRS §5.7) as the largest unaddressed functional gap.
> **Next:** see `NEXT_STEPS.md` for the prioritized punch list.
