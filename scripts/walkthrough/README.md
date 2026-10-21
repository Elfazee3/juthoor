# Juthoor walkthrough recorder

Produces `recordings/juthoor-walkthrough-<date>.mp4`: a scripted Google Chrome screen recording of every page and flow,
with an on-screen cursor, bilingual captions and chapter cards. Runs against the **local** demo stack only.

## Prerequisites (one-time)
- Docker Desktop running, Node 22, pnpm, Python 3 with `requests` + `Pillow`, ffmpeg (`winget install Gyan.FFmpeg`).
- `C:\Users\youssefbouz\ancestry\juthoor-local` installed (`pnpm install`), `apps/web/.env.local` pointing at the local stack.
- Google Chrome installed (Playwright drives it through the `chrome` channel; no extra browser download).

## Record
```bash
cd C:/Users/youssefbouz/ancestry/juthoor-local/apps/database && npx supabase start
cd ../web && pnpm build && pnpm start          # production server on http://localhost:3000
cd C:/Users/youssefbouz/ancestry/juthoor/recordings/scripts && ./final.sh
```
`final.sh` reseeds the demo data (`prep.sh`), records the desktop take, the phone take and the outro, then concatenates
them into the MP4 (`assemble.sh`).

## Pieces
- `walkthrough.cjs` — entry point. `node walkthrough.cjs intro,public` records only those flows; `TEST_LOGIN=<email>`
  signs in first, `TEST_TREE=<uuid>` presets the tree id, `VIEWPORT=390x844` records a phone-sized take.
- `flows2.cjs` — the data-driven flows (dashboard, tree builder, chart, people, GEDCOM, finder, access request,
  directories, owner inbox, admin, connections, verified member, preferences).
- `lib.cjs` — recorder: Chrome launch + video, cursor/caption/chapter overlay, human-paced actions.
- `explore.cjs` — headless page dumper used to discover selectors (`node explore.cjs <email|anon> <urls…>`).
- `fixture.ged` — the GEDCOM file imported during the take.

Demo accounts and passwords: `apps/database/supabase/demo/seed_demo_mock.sql` (juthoor-local). Mock ID documents:
`juthoor/mock-demo-docs/`.

## In this repository

These scripts were copied here from the author's working folder on 21 October 2026 so they are versioned with the app.
The paths inside `explore.cjs`, `lib.cjs`, `final.sh` and `flows2.cjs` still point at `C:/Users/youssefbouz/ancestry/...`;
change them before running on another machine. The mock ID images used by the upload flow are in `mock-docs/`.
They are watermarked "MOCK DOCUMENT - NOT VALID - DEMO ONLY". The rendered videos are not stored in git because of their size.
