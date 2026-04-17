# Juthoor — جذور

> **Palestinian Roots Platform** — Connecting 15.2 million scattered Palestinians through a unified, intelligent family tree network. Arabic-first. Free access by mission.

---

## Overview

**Juthoor** (جذور, meaning "Roots") is a bilingual (Arabic/English) genealogy platform built to help Palestinians worldwide rebuild, preserve, and share their family trees. The platform is designed around:

- **Arabic-first, RTL-native** user experience
- **GEDCOM 7.0.18** international genealogy standard compliance (round-trip import/export)
- **Fellegi-Sunter** probabilistic matching engine for connecting family trees
- **Row Level Security** — every family's data is protected at the database layer
- **530+ depopulated Palestinian villages** seeded as reference data (1948 Nakba)

### Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS (RTL-enabled) |
| Database | Supabase (PostgreSQL 15) |
| Auth | Supabase Auth |
| Genealogy Format | GEDCOM 7.0.18 |
| Arabic NLP | jslingua (JS) + pyarabic (planned) |
| Tree Visualization | family-chart + react-family-tree (planned) |

---

## Project Status

**Phase 0 — Foundation:** ✅ Complete
**Step 2 — Database Schema:** ✅ Complete (GEDCOM 7-aligned, 263 villages seeded)
**Step 3 — Tree Builder:** 🎯 Next up

See [`PROGRESS.md`](./PROGRESS.md) for detailed task tracking.
See [`docs/Juthoor_Progress_Report.pdf`](./docs/Juthoor_Progress_Report.pdf) for a non-technical overview.

---

## Database Schema (GEDCOM 7 Aligned)

Ten tables covering persons, families, events, places, and matching:

| Table | GEDCOM Tag | Purpose |
|---|---|---|
| `persons` | INDI | Individual person records |
| `person_names` | NAME | Multi-language names (AR + EN), birth/married/maiden |
| `families` | FAM | Family unit linking two partners |
| `family_children` | CHIL | Child-to-family with pedigree (birth/adopted/foster) |
| `events` | BIRT/DEAT/EMIG/MARR... | Life events with date + place |
| `places` | PLAC | Bilingual places with coordinates |
| `trees` | — | Family tree container |
| `tree_members` | — | Access control (owner/collaborator/read-only) |
| `matches` | — | Fellegi-Sunter matching results |
| `profiles` | SUBM | User profiles (extends Supabase Auth) |

**Security:** 38 Row Level Security policies enforce access at the database level.

**Migrations:** Versioned in `apps/database/supabase/migrations/`.

---

## Development

### Prerequisites

- Node.js 22+
- pnpm
- Supabase account + project

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env file and add your Supabase credentials
cp apps/web/.env.local.example apps/web/.env.local
# Edit .env.local with:
#   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
#   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-key>

# 3. Apply database migrations (via Supabase dashboard SQL editor or CLI)
# Migrations are in: apps/database/supabase/migrations/
#   - 20260416120000_juthoor_gedcom_schema.sql  (tables, enums, triggers)
#   - 20260416120001_juthoor_rls_policies.sql   (RLS policies)

# 4. Seed the villages (optional, after auth setup)
# File: apps/database/supabase/seed_villages.sql (263 depopulated villages)

# 5. Generate TypeScript types (after login)
npx supabase login
npx supabase gen types typescript --project-id <ref> > apps/web/src/types/database.ts

# 6. Run the dev server
pnpm dev
```

Visit `http://localhost:3000`.

---

## Architecture Principles

1. **Immutability** — Always create new objects, never mutate existing ones
2. **Many small files** — Typical 200-400 lines, 800 max; organized by feature
3. **Fail fast validation** — All user input validated at system boundaries
4. **Bilingual by default** — Every user-facing string supports AR + EN
5. **Schema-first** — TypeScript types derived from Supabase schema

---

## Mission & Values

Palestine has over 15 million people scattered across the world after the 1948 Nakba and subsequent displacements. Family trees have been fragmented across generations, refugee camps, and diaspora communities. Juthoor aims to:

- **Rebuild the Mother Tree** — one merged family tree connecting all Palestinians
- **Honor origin villages** — each of the 530 depopulated villages has a place in our data model
- **Preserve Arabic naming** — maiden names, tribal lineages, honorifics (أبو, ابن, etc.) treated as first-class
- **Free access always** — genealogy as a right, not a subscription

---

## Roadmap

### Phase 1 — MVP (Current)
- [x] Step 1: Scaffold, branding, Arabic RTL, auth
- [x] Step 2: Database schema (GEDCOM 7 aligned, villages seeded)
- [ ] Step 3: Tree Builder (Add Person, 360° view, GEDCOM import/export)
- [ ] Step 4: Family Finder (phonetic search, Arabic name variants)
- [ ] Step 5: Matching Engine (Fellegi-Sunter batch process)
- [ ] Step 6: Auth + Access Control polish
- [ ] Step 7: RTL + Bilingual polish

### Phase 2 — Growth
- Tree collaboration (invite family members)
- Village pages (each of 530 villages gets a page)
- Document crowdsourcing (Ottoman deeds, UNRWA records)
- Evidence confidence meters

### Phase 3 — Scale
- Performance (P95 < 2s)
- 99.9% uptime SLA
- Native iOS + Android apps
- 20,000 MAU target

---

## Documentation

- [`PROGRESS.md`](./PROGRESS.md) — Detailed task tracker (checkboxes per feature)
- [`docs/Juthoor_Progress_Report.pdf`](./docs/Juthoor_Progress_Report.pdf) — Non-technical stakeholder overview
- [`apps/database/supabase/migrations/`](./apps/database/supabase/migrations/) — All schema migrations
- [`apps/web/src/types/database.ts`](./apps/web/src/types/database.ts) — TypeScript database types

---

## References

- **GEDCOM 7 Spec:** https://gedcom.io/specifications/FamilySearchGEDCOMv7.html
- **GedcomParser (C# reference):** https://github.com/jaklithn/GedcomParser
- **Palestine Remembered:** https://www.palestineremembered.com
- **Fellegi-Sunter Record Linkage:** Splink library

---

## License

MIT — free for the Palestinian community and all who want to contribute.

---

**Juthoor — جذور**
Connecting Palestinian roots, one family at a time.
