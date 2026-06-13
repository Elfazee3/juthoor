# Juthoor — End-to-End Test Report

**Date:** 2026-04-24
**Scope:** Complete Family Finder flow (Milestones 4.1 → 4.4) plus all marketing pages, executed against the hosted Supabase project `nlufpicjdeeqcgepewdg`.
**Method:** Real DB seeded with 2 users + 3 trees + 10 persons + 4 families + 10 events. Flow exercised through Playwright (UI) + direct RPC calls (backend proof).
**Outcome:** **✅ End-to-end flow works** after fixing 3 real bugs surfaced during testing. 5 additional issues flagged for follow-up.

---

## 1. Test fixtures seeded

| Entity | Details |
|---|---|
| **User 1 (owner)** | `demo@juthoor.test` / `demo-password-1234` — "Yousef (Demo)", self-person = يوسف العجرمي |
| **User 2 (stranger)** | `stranger@juthoor.test` / `stranger-pass-1234` — "Layla Khoury", no self-person |
| **Public tree** | `عائلة العجرمي — شجرة تجريبيّة` — 9 persons, 4 families, 9 events across 3 generations. All demographics + BIRT place_ids populated for search testing. |
| **Private tree** | `عائلة الخوري — خاصّة` — 1 person (سليم خوري, b. 1910, حيفا). Used to test access-request flow. |

---

## 2. What was captured (20 screenshots)

Saved at project root `juthoor/e2e-*.png`.

### Public marketing pages (anonymous)

| # | File | What it proves |
|---|---|---|
| 01 | `e2e-01-home-hero-ar.png` | Homepage AR — "جُذور" Amiri display + gold underline, RTL layout, locale toggle, olive CTA "ابدأ شجرتك — مجّانًا" |
| 02 | `e2e-02-home-stats-marquee-ar.png` | Stat counters mid-animation (**14.7M → 15.2M still counting**), villages marquee with real DB villages (حيفا، يافا، صفد، بيسان، دير ياسين، اللد), manifesto beginning |
| 03 | `e2e-03-home-timeline-ar.png` | Three pillars (منشئ الشجرة / الشجرة الأم / أرشيف القرى), oral-history quote begin |
| 04 | `e2e-04-home-map-cta-ar.png` | Dark-olive final CTA panel with gold button + Palestinian flag trust strip |
| 05 | `e2e-05-home-hero-en.png` | Locale flipped to EN — LTR layout, "Juthoor" hero, "A thread that reweaves the story" |
| 06 | `e2e-06-about-hero.png` | About page hero — "Why Juthoor?" + "Not an app. Not a product." |
| 07 | `e2e-07-about-principles.png` | Six principles grid (Non-profit / Arabic-first / Private by design / Open source / Community-owned / Gentle) |
| 08 | `e2e-08-about-refuse.png` | "We are not Ancestry.com" — 4 red-X commitments + 263/14/$0/∞ stats |
| 09 | `e2e-09-login.png` | Bilingual login page ("تسجيل الدخول إلى جذور / Login with your Juthoor account") |

### Owner-authenticated flows (demo@juthoor.test)

| # | File | What it proves |
|---|---|---|
| 10 | `e2e-10-dashboard-owner.png` | **BEFORE FIX**: dashboard picked the empty default tree → 0 people. |
| 11 | `e2e-11-dashboard-with-tree.png` | **AFTER FIX**: dashboard shows "عائلة العجرمي" tree, **9 people**, recently added list (Yousef, Ahmad, Fatima, Mohammed, Aisha, Ibrahim, …) |
| 12 | `e2e-12-search-ahmad.png` | Search `أحمد` → 1 match: **Ahmad Al-Ajrami, 1965, اللد, PUBLIC, `1° CHILD`, 22% POSSIBLE** |
| 13 | `e2e-13-search-ibraheem-phonetic.png` | **🎯 Phonetic match**: Latin "Ibraheem" → إبراهيم الحاج, 1928, يافا, `2° GRANDPARENT`. Server-side transliteration + trigram match working. |
| 14 | `e2e-14-search-surname-ajrami.png` | Surname "العجرمي" → 5 matches with degree chips: Ahmad `1° CHILD`, Khaled `2° AUNT/UNCLE`, Sami `3° FIRST COUSIN`, Mohammed `2° grandparent`. **BFS + kinship labels accurate.** |

### E2E access-request flow

| # | File | What it proves |
|---|---|---|
| 15 | `e2e-15-stranger-search-empty.png` | Stranger searches "خوري" — no results (RLS hides private tree). Security working — but see Issue #4. |
| 16 | `e2e-16-stranger-no-khoury-rls.png` | Same view, full frame — "لا نتائج بعد" empty state |
| 17 | `e2e-17-owner-inbox-with-request.png` | **BEFORE FIX**: `/dashboard/requests` crashed with `"use server" can only export async functions` |
| 18 | `e2e-18-owner-inbox-pending.png` | **AFTER FIX #6**: inbox loads — but shows empty state despite pending request in DB |
| 19 | `e2e-19-owner-inbox-with-pending.png` | **AFTER FIX #7**: inbox shows pending request card with Arabic note "جدّتي الكبرى كانت من آل خوري في حيفا. أبحث عن الرابط العائلي." |
| 20 | `e2e-20-stranger-post-approve-khoury.png` | **🎉 SUCCESS**: post-approval, stranger searches "خوري" → **sees سليم خوري / Saleem Khoury, 1910, حيفا, من شجرة عائلة الخوري — خاصّة**. RLS flipped from block → allow after status pending→approved. |

---

## 3. Backend end-to-end flow (verified via SQL with JWT impersonation)

| Step | Actor | Action | Result |
|---|---|---|---|
| 1 | Stranger | `request_tree_access(khoury_tree, 'read_only', proof_path, note)` | Inserted pending `tree_members` row `678697c1…` |
| 2 | Stranger | `can_access_tree(khoury_tree)` | **FALSE** — pending ≠ approved ✅ |
| 3 | Stranger | `SELECT * FROM persons WHERE tree_id = khoury` | **0 rows** — RLS blocks ✅ |
| 4 | Owner | `approve_tree_access_request('678697c1…')` | status=approved, role=read_only, reviewed_at stamped |
| 5 | Stranger | `can_access_tree(khoury_tree)` | **TRUE** ✅ |
| 6 | Stranger | `SELECT display_name_ar FROM persons WHERE tree_id = khoury` | Returns **"سليم خوري"** ✅ |

Complete trust transition proven: the same stranger goes from zero visibility → full `read_only` member without any other change.

---

## 4. Bugs surfaced & fixed during testing

These were **real product bugs** the 4.x milestones shipped with. All three have been fixed in this session.

### 🐛 BUG #5 — Access request RPC blocked by its own RLS _(FIXED)_

**Symptom:** `request_tree_access` RPC returned `ERROR 42501: new row violates row-level security policy for table "tree_members"`.

**Root cause:** RPC was declared `SECURITY INVOKER` — meant to respect caller's RLS — but I added SELECT policies on `tree_members` (owner sees pending, requester sees own) and forgot the INSERT policy.

**Fix:** Migration `access_request_rpcs_definer_fix` — changed all 3 RPCs (`request_tree_access`, `approve_tree_access_request`, `reject_tree_access_request`) to `SECURITY DEFINER`. Safety is preserved because the functions check `auth.uid()` internally:
- `request_tree_access` refuses if caller owns the tree
- `approve/reject` refuse if caller isn't the tree owner
- Idempotency preserved (duplicate pending → returns existing row)

### 🐛 BUG #6 — `use server` file can't export objects _(FIXED)_

**Symptom:** Runtime error in Next.js: `A "use server" file can only export async functions, found object.` Location: `src/data/user/access.ts:123` on module evaluation, breaking the entire `/dashboard/requests` route.

**Root cause:** I had `export const RoleEnum = z.enum([…])` at module top level. Next.js enforces that all exports from a `'use server'` file be async functions (because each exported symbol becomes an RPC endpoint).

**Fix:** Changed `export const RoleEnum` → `const RoleEnum`. The enum is only used inside `submitAccessRequest` for validation; nothing external consumes it.

### 🐛 BUG #7 — PostgREST nested join broken _(FIXED)_

**Symptom:** `/dashboard/requests` loaded successfully but showed "No pending requests" despite a row existing in DB.

**Root cause:** `listIncomingRequests` used `profiles!tree_members_user_id_fkey(display_name)` — but there's **no direct FK between `tree_members` and `profiles`** (both point to `auth.users`, but PostgREST needs a direct relationship to resolve nested selects). The query returned an error, the server-side try/catch swallowed it into an empty list.

**Fix:** Rewrote the function to do 3 lightweight queries + in-memory join:
1. `SELECT … FROM tree_members WHERE status = 'pending'` (RLS filters to caller's trees)
2. `SELECT id, name FROM trees WHERE id IN (…)`
3. `SELECT id, display_name, display_name_ar FROM profiles WHERE id IN (…)`

Storage signed-URL generation stays per-row (required anyway).

---

## 5. Issues flagged (not fixed — need product decisions)

### ⚠️ ISSUE #1 — Dashboard picked empty placeholder tree

**Found:** Logging in as demo, dashboard showed "شجرة عائلتي" (empty auto-created tree) instead of the seeded Al-Ajrami tree.

**Cause:** `ensureUserHasDefaultTree()` picks the **oldest** tree by `created_at ASC`. The empty default was created earlier.

**Current mitigation:** I deleted the empty tree, so Al-Ajrami became the oldest and now surfaces. Real users won't hit this — they'll auto-create their tree first.

**Recommended fix:** Change ordering to `ORDER BY (CASE WHEN person_count > 0 THEN 0 ELSE 1 END), created_at DESC` — prefer non-empty trees.

### ⚠️ ISSUE #2 — Sidebar still shows "Nextbase / Private Items"

**Found:** Every authenticated page still has the starter-kit sidebar with "Nextbase / Open Source" header, "Private Items" link, and demo email shown raw (`demo@juthoor.test` instead of "Yousef (Demo)").

**Cause:** `src/app/(app-pages)/app-sidebar.tsx` was never rebranded — still boilerplate from the scaffold.

**Recommended fix:** Rebrand app-sidebar (1-2 hours) to match the external navbar — Juthoor logo, "شجرة العائلة / Family Tree" links, locale toggle. Also switch the displayed name to `profiles.display_name_ar || profiles.display_name`.

### ⚠️ ISSUE #3 — Dashboard "Villages" stat shows 0

**Found:** With 9 BIRT events all having `place_id`, the dashboard "Villages" stat still reads 0.

**Cause:** Dashboard's `loadDashboard()` queries `events.select('place_id, places(…)').eq('tree_id', treeId).not('place_id','is',null).limit(6)` — but then `Stat` computes `new Set(userOrigins.map(o => o.place_id).filter(Boolean)).size`. The PostgREST response may be returning strings or the nested `places` shape isn't what the client expects. Needs a 10-minute follow-up.

### ⚠️ ISSUE #4 — DESIGN GAP: private trees invisible in search

**Found:** Stranger searching "خوري" (a name ONLY in a private tree) gets zero results. Because `search_master_tree` runs with RLS, private-tree rows are filtered before the stranger sees anything. That means **the stranger can never find the private tree through search to click "request access"** — the lock-icon flow in the UI is effectively unreachable.

**Decision needed:** Pick one:
- **A — Leaky directory:** Return private-tree persons with names redacted + a lock icon. User clicks → request access. Leaks the EXISTENCE of a match, not the data.
- **B — Separate browse:** Add a `/trees` directory page listing all trees (public + owned + private-but-not-yours-labeled-as-locked). No name-level leaks, slower discovery.
- **C — Invitation-only:** Private trees are only found via share-link from the owner. No search discovery path. Simplest, most restrictive.

My recommendation: **Option A**, because it's what every family-history platform does and matches the "Master Tree" mental model in the PRD.

### ⚠️ ISSUE #8 — Owner inbox RTL: action buttons clip off-screen

**Found:** In `/dashboard/requests` with AR locale, the Approve/Reject buttons get pushed off the left edge because the card flex is `flex-wrap items-start justify-between` but the breadcrumb sidebar consumes the right side.

**Cause:** Cosmetic RTL issue. Cards need `flex-col md:flex-row` or explicit width clamp.

**Recommended fix:** 15-minute tweak on `RequestsClient.tsx` — wrap the button pair in a container that stays on screen.

---

## 6. Coverage matrix — what's verified working

| Feature | DB migration | RPC | UI | E2E tested |
|---|:-:|:-:|:-:|:-:|
| **4.1 Arabic normalization** | ✅ `normalize_arabic` fn | ✅ v1 RPC | ✅ | ✅ "أحمد" → match |
| **4.2 Phonetic folding** | ✅ `arabic_phonetic` fn + generated columns + GIN indexes | ✅ v2 RPC with 8 params | ✅ jslingua client-side transliteration | ✅ "Ibraheem" → "إبراهيم" |
| **4.2 Village autocomplete** | ✅ trgm index on places | ✅ `loadVillagesForFilter()` | ✅ `VillageCombobox` | Partial (seen in advanced form) |
| **4.2 Year ± window** | — | ✅ linear decay scoring | ✅ `YearRangeInput` | ✅ via SQL test |
| **4.2 Gender filter** | — | ✅ exclude in WHERE | ✅ `GenderPicker` | ✅ via SQL test |
| **4.2 Per-field scoring breakdown** | — | ✅ JSONB breakdown | ✅ `ScoreBreakdownPopover` | ✅ "22% POSSIBLE" chip visible |
| **4.3 BFS degrees** | ✅ `match_paths` + RLS + cache | ✅ `compute_degrees` | ✅ `DegreeChip` + `PathGraph` + `DegreesDialog` | ✅ 1°/2°/3° all correct |
| **4.3 Kinship labels** | — | — | ✅ `relationLabels.ts` | ✅ CHILD / AUNT-UNCLE / FIRST COUSIN / GRANDPARENT visible |
| **4.4 `tree_member_status` state machine** | ✅ enum + columns + policies | — | — | ✅ pending → approved |
| **4.4 Proof-of-family bucket + RLS** | ✅ storage policies | — | Skipped UI upload (needs browser file dialog) | Path convention verified |
| **4.4 `request_tree_access`** | — | ✅ SECURITY DEFINER | ✅ `RequestAccessDialog` | ✅ creates pending row |
| **4.4 `approve/reject`** | — | ✅ SECURITY DEFINER | ✅ `RequestsClient` | ✅ owner approves |
| **4.4 `can_access_tree` now checks status** | ✅ updated helper | — | — | ✅ blocks pending, grants approved |
| **i18n** | — | — | ✅ `LocaleProvider` + toggle | ✅ AR/EN flip, RTL/LTR |
| **NGO scroll design** | — | — | ✅ HomeClient + AboutClient + ScrollProgress + StatCounter | ✅ Arabic + English |

---

## 7. Overall verdict

**Backend:** Strong. All 3 real bugs found in 4.4 were in function declaration / schema-join details — not architectural. RLS + RPC + cache all behaved correctly once policies were right.

**Frontend:** Solid for first pass. Search / degrees / request-dialog / owner-inbox all animate and render bilingually. Two cosmetic issues (RTL buttons, sidebar branding) are low-effort fixes.

**Shippable today?** Not quite — block on Issue #4 (private-tree discoverability design decision) + Issue #2 (app sidebar branding). Everything else is iteration.

**Next session recommendations:**
1. Rebrand app-sidebar to match external navbar (1h)
2. Pick + implement Issue #4 design (A/B/C) — I recommend A (2h)
3. Fix RTL buttons in owner inbox (15m)
4. Add Resend email on request/approve/reject state changes (2h) — requires your domain + Resend API key
5. Then: kick off Step 5 Matching Engine (Fellegi-Sunter) — the groundwork is all here (normalized names + phonetic + indexes).
