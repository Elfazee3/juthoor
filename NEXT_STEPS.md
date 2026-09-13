# Juthoor — Prioritized Punch List

> Companion to `PROGRESS.md`. Written 2026-09-13 against `main` @ `c79a43d`. Ordered by priority within each tier — top of a tier is more urgent than the bottom.

---

## P0 — Blockers to trusting the system with real user data

1. **Decide and document the auto-merge rollout plan.** The matching engine is fully built but `app_settings.auto_merge_enabled = false`. `docs/LOOP_STATE.md` recommends a 4-week shadow period (run `run_matching_batch` nightly, label results via `/admin/review`, watch `run_eval` precision/recall) before flipping the switch. This hasn't started. Without it, duplicate trees never merge and the platform's core value proposition (one unified Palestinian Family Tree) doesn't materialize.
2. **Schedule the batch matcher.** `run_matching_batch` exists and works but nothing currently calls it on a schedule — pg_cron wiring was explicitly deferred. Matching only happens when someone manually invokes it.
3. **Resolve the `profiles.self_person_id` schema drift.** Flagged live during the B19 migration: this column exists on production but is missing from the local migration history. Any future `db reset` or fresh environment will be missing a column the app code (`degrees.ts`, search) depends on. Dump it into a migration the same way B1 did for the other live-only objects.
4. **Confirm staging vs. production Supabase separation, and a backup/retention policy.** Both are still listed as "to be confirmed" in the FRS's own architecture table. Right now all migration and matching-engine work has been tested against the *live* production project (with explicit user authorization) — there is no isolated staging environment for the next round of schema changes.
5. **Reconcile the migration history if you ever plan to use `supabase db push`.** The live-apply ledger in `docs/LOOP_STATE.md` notes that MCP `apply_migration` stamped its own version timestamps into `schema_migrations`, which will conflict with the repo's migration file timestamps on a future `db push`. The exact `supabase migration repair` commands needed are already written down there — just needs running before anyone pushes via CLI.

## P1 — Functional gaps that block core FRS use cases

6. **Build the Displacement Documentation data model (FRS §5.7).** This is the FRS's own stated "most important section" and it's currently the single biggest gap: no structured fields for UNRWA registration number, host-country 1948 family card, refugee status, camp of registration, PA ID, Palestinian passport, Israeli-issued ID, or land/property records. Recommend: a new `identity_documents` (or similar) table keyed to `persons`, modeled after the existing `events`/`attachments` pattern, with the two FRS "perfect-match" fields (UNRWA number, 1948 family card) flagged for the matching engine.
7. **Wire the two perfect-match identifiers into the scorer.** Once (6) exists, `score_pair` needs a short-circuit: a match on UNRWA number or 1948 family card should override the weighted score entirely, per FRS §3.6. This is a scorer change, not a schema-only one.
8. **Get a linguist-reviewed English↔Arabic phonetic conversion table.** The FRS calls for this explicitly (§3.1) as a distinct requirement from the internal matching transliterator. The current `transliterate_to_arabic` (15 hardcoded rules) was built for matching purposes and has already had one bug found and fixed in review — it hasn't been vetted as a general-purpose data-entry conversion table. `docs/LOOP_STATE.md`'s own "Open Technical Items" list flags this as needing a transliteration specialist.
9. **Tabular children-entry form.** Still one-at-a-time via the add-relative sheet; FRS wants a batch table with dropdowns for surname/mother/origin. Low technical risk, mostly a UI task on top of the existing `addRelativeAction`.

## P2 — Missing GUI modules from the spec

10. **Document Archive module (FRS Appendix 2, Module 8.0).** No standalone browse/search UI exists — documents are currently only visible as attachments on individual person records. Needs its own listing/search page, most naturally scoped per-tree or per-village.
11. **Picture Gallery as a real module (Module 7.0).** Same gap as above but for photos — currently per-person only, no cross-tree gallery.
12. **Village pages content completeness.** `/villages` and `/villages/[placeId]` exist but it's unverified whether they actually list "all documented families from that village" as the FRS and the platform's own use-cases (Appendix 1, Use Case 7 — "847 documented descendants") describe. Worth an audit against real seeded data.

## P3 — Housekeeping / hygiene

13. **Decide whether Magic Link login should come back.** It was deleted, not fixed, because the local dev mail relay (Mailpit) sends a malformed magic-link email. If magic-link is wanted for production, this needs a real fix (or confirmation the local-dev issue doesn't affect production Supabase Auth) rather than a permanent removal.
14. **Copy review pass.** Arabic and English UI copy have never had a formal review/sign-off per PROGRESS.md's own checklist — worth doing before a public soft-launch given how central language and tone are to this platform's mission.
15. **Dark mode verification** in both RTL and LTR — untested by any report or E2E spec found.
16. **Performance testing at realistic scale.** Current numbers (<400ms search, <100ms BFS degrees) are measured against a 9–10 row test dataset. The FRS envisions millions of nodes; there's no load test or profiling against anything close to that yet, and `docs/LOOP_STATE.md` itself flags that a materialised closure table for degrees-of-separation should only be introduced "when profiling with realistic data volumes justifies it" — that profiling hasn't happened.
17. **Type-generation process risk.** `types/database.ts` is hand-maintained by convention (running `supabase gen` would silently overwrite curated types). There's no lint/CI check preventing someone from running codegen and breaking the app — worth a guard comment at minimum, a CI check ideally.
18. **Accessibility, GDPR, and security-audit items from Phase 3** — all still fully open, expected at this stage, listed here only so they don't get lost.

---

## What NOT to worry about
The matching engine, RLS/security posture, and auth hardening are in genuinely good shape — better tested (183 pgTAP assertions, 131 unit tests, 15 E2E specs) than almost anything else in the repo. The main risk there is process (nothing scheduled to *run* the matcher, no shadow-period plan) rather than code quality.
