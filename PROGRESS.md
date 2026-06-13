# Juthoor — جذور | Project Progress Tracker

> **How to use:** Claude checks boxes `[x]` as each item is completed. Never mark done unless fully built, tested, and committed to GitHub.
> 
> **Sources:** This file is derived from two documents:
> - `main/PRD.md` — Product Requirements Document (phases, features, metrics)
> - `Downloads/Functional Requirements Specification Document.docx` — Detailed functional spec (exact behaviour, rules, logic)

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
- [x] Seed `places` table with 263 depopulated Palestinian villages (all 14 districts covered)
- [x] Verify schema in Supabase Table Editor — all tables + RLS confirmed
- [x] Generate TypeScript types from schema (apps/web/src/types/database.ts)

### Step 3: Tree Builder
- [x] "Add Person" form — fields: Arabic name, English name, birth year, death year, village, gender
- [x] Field tooltips on hover (FRS: "hovering over any field shows a pop-up description")
- [x] 360° person view — centre: person name, up: parents, down: children, right: siblings, left: spouse/partner
- [x] Click on any person in 360° view → that person becomes the new centre focus (FRS: Navigation)
- [ ] Default surname = father's surname (FRS: auto-inherit)
- [ ] Default village/origin = father's origin (FRS: auto-inherit)
- [x] Female entries use maiden name, not married name (FRS requirement)
- [x] If mother is unknown → system inserts placeholder "Female 1" linked as spouse to father (auto-created by `addRelativeAction`)
- [x] When mother details added later → prompt user to link each child to the mother (`UpgradePlaceholderDialog` + affected-children review)
- [ ] Children entry form: tabular with dropdowns for surname, mother name, origin
- [x] Validation: each child must be linked to a mother (FRS rule 11, enforced in `zodSchemas` + server action)
- [x] Multi-spouse validation: if individual married more than once, validate correct mother per child (mother picker in Add form + server check)
- [x] Hover over person name → pop-up summary of that person
- [x] GEDCOM import — parse `.ged` files and populate the tree (uses `parse-gedcom`, 5 MB cap)
- [x] GEDCOM export — download tree as `.ged` file
- [x] Tree rendered visually on screen (relatives-tree layout + custom canvas chart)
- [x] Tree is saved to Supabase in real time

### Step 3.5: Tree UX Overhaul — Ancestry-parity (2026-06-12)
> Benchmarked the real Ancestry.com tree experience (10,628-person Palestinian tree) in a live browser session and replicated its user journey in Juthoor.

- [x] **Atomic add-relative backend** — `addRelativeAction` creates person + family link in one server action (plan → create → link → compensating rollback). Fixed the "person created but never linked / invisible in chart" bug
- [x] Fixed `upgradePlaceholderPersonAction` writing nonexistent persons columns — years/place now write to `events` (BIRT/DEAT)
- [x] Life years + birth village loaded into the chart snapshot (BIRT/DEAT events) — cards show "1950 – 2020 • القرية"
- [x] **Chart redesign**: translate/scale camera (drag-pan, wheel-zoom toward cursor), auto-center on focus, toolbar (zoom %, fit, re-center, home person), dot-grid canvas, generation rail labels (الوالدان / الذات والأشقاء / الأبناء)
- [x] **Connectors drawn from family data** (marriage line + stem→bus→drops) — every line snaps exactly to card edges
- [x] **Phantom-partner layout fix** — single-parent families no longer drop branches; the missing parent renders as a ghost card «+ أضف الأم» (dashed marriage line), click opens the add-spouse sheet
- [x] **Ghost-repair on save** — adding a spouse fills the empty family slot so existing children gain their second parent (no duplicate families)
- [x] Card redesign: gender accent bar, gradient avatar initial, placeholder badge «مؤقت», focus/selected rings; hover `+` buttons open the inline add sheet (`?selected=&add=`)
- [x] **«كل الأشخاص» list view** (`/tree/[treeId]/people`) — Ancestry "List of all people": name search (ar/en), filter chips (gender / living / deceased / placeholder), Name|Birth|Death columns, pagination, row click jumps the chart to that person
- [x] **«ابحث في الشجرة» panel** — find-in-tree sidebar: live name search over the snapshot, current-focus quick row, jump-to-person re-roots the chart, link to the full list
- [x] Auth hardening: client-only render of auth forms (kills extension-injected `fdprocessedid` hydration crashes), OTP copy corrected to 8 digits, Password tab is now the default login method

### Step 4: Family Finder
- [x] Search form: filter by Name, Phonetic Name, Surname, Phonetic Surname
- [x] Search form: filter by Date of Birth (± year window), Place of Birth / Origin
- [x] Phonetic search — handles Arabic name variants (via `arabic_phonetic` + `normalize_arabic` Postgres functions)
- [x] Arabic ↔ English language toggle (LocaleContext)
- [ ] Phonetic conversion table: translates English input → Arabic canonical form
- [x] Search results from the Master Tree (all connected trees — `search_master_tree` RPC with score breakdown)
- [x] If search finds a match → show "degrees of separation" path between user and matched person (`compute_degrees` + PathGraph)
- [x] Proof-of-family upload when requesting Write access to a tree (FRS: Permissions)
- [x] Request access flow: authenticated user requests Read/Write access for a specific tree (request → owner approves/rejects in dashboard)

### Step 5: Matching Engine (Fellegi-Sunter)
- [ ] Matching runs as end-of-day batch process (not real time — FRS requirement)
- [ ] Matching weight table implemented (see FRS — 25 parameters with weighted scores)
  - [ ] Name (weight: 10)
  - [ ] Phonetic Name (weight: 10)
  - [ ] Surname (weight: 10)
  - [ ] Phonetic Surname (weight: 10)
  - [ ] Father's Name (weight: 10)
  - [ ] Phonetic Father's Name (weight: 10)
  - [ ] Origin (weight: 10)
  - [ ] Mother's Name (weight: 20)
  - [ ] Phonetic Mother's Name (weight: 20)
  - [ ] Spouse's Name (weight: 25)
  - [ ] Phonetic Spouse's Name (weight: 25)
  - [ ] Paternal Grandfather's Name (weight: 25)
  - [ ] Paternal Grandmother's Name (weight: 25)
  - [ ] Paternal Grandmother's Phonetic Name (weight: 25)
  - [ ] Paternal Grandfather's Phonetic Name (weight: 25)
  - [ ] Maternal Grandfather's Name (weight: 25)
  - [ ] Maternal Grandfather's Phonetic Name (weight: 25)
  - [ ] Maternal Grandmother's Name (weight: 25)
  - [ ] Maternal Grandmother's Phonetic Name (weight: 25)
  - [ ] Number of Children (weight: 15)
  - [ ] Date of Birth (weight: 25)
  - [ ] Place of Birth (weight: 25)
  - [ ] Date of Death (weight: 25)
  - [ ] Place of Death (weight: 25)
  - [ ] Email Address (weight: 25)
- [ ] Score >= 450 → auto-merge (no admin required) (FRS requirement)
- [ ] Score < 450 → added to admin review report
- [ ] Daily admin report: list of duplicates and inconsistencies for review
- [ ] Admin can resolve: merge, reject, or defer each match
- [ ] Arabic name normalisation pipeline (`jslingua` + `pyarabic`)
- [ ] When trees merge → notify both family owners

### Step 6: Auth + Access Control
- [ ] Email/password signup and login (Supabase Auth — already scaffolded)
- [ ] Magic link login option
- [ ] Protected routes: tree builder and family finder require login
- [ ] Role system: owner / collaborator / read-only / admin
- [ ] Admin dashboard: manage match reports, approve/reject tree access requests

### Step 7: RTL + Bilingual Polish
- [ ] Full RTL layout verified across all pages
- [ ] Language toggle button on homepage (AR ↔ EN)
- [ ] All Arabic UI copy reviewed and approved
- [ ] All English UI copy reviewed
- [ ] Arabic body text uses Cairo font, display headings use Amiri
- [ ] Dark mode tested in both RTL and LTR
- [ ] Mobile responsive layout (360px minimum — for users in camps)

---

## PHASE 2 — Growth

- [ ] Tree collaboration — share tree with a family member (invite by email)
- [ ] Village pages — each of the 530 villages has its own page listing all families from that village
- [ ] Document crowdsourcing — upload Ottoman land deeds, UNRWA records, Mandate papers
- [ ] Evidence confidence meter per person/event (certain / likely / possible / uncertain)
- [ ] Email notifications for match found, access request, merge completed
- [ ] Mobile responsive improvements
- [ ] SEO + Arabic search engine optimisation

---

## PHASE 3 — Scale

- [ ] Performance: P95 page load < 2 seconds
- [ ] Uptime SLA: 99.9%
- [ ] GDPR / data privacy audit
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] 20,000 MAU target infrastructure review
- [ ] Native iOS app
- [ ] Native Android app

---

## Ongoing / Always Active

- [ ] `.env.local` never committed to GitHub (secrets safe)
- [ ] All Supabase tables have RLS enabled
- [ ] No hardcoded secrets anywhere in codebase
- [ ] TypeScript types kept in sync with Supabase schema after every migration

---

> **Last updated by Claude:** Step 2 complete — GEDCOM 7-aligned schema (10 tables, 38 RLS policies, 263 villages seeded, TypeScript types generated).  
> **Next:** Step 3 — Tree Builder UI.
