-- pgTAP: M3 review surfaces (B14, plan §6/§7-M3).
-- Proves the substrate exists, the linkage graph is admin-only, the masked
-- match_review_cards reveals only deceased-public detail (and redacts/suppresses
-- otherwise), the person_identity_groups overlay is a correct union-find over
-- CONFIRMED links, the status trigger writes match_audit, and the owner hint queue
-- is per-owner.
BEGIN;
SELECT plan(27);

-- ── users (profiles auto-created by trigger) ────────────────────────────────
INSERT INTO auth.users (id, email, aud, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@test.juthoor',  'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'owner1@test.juthoor', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'owner2@test.juthoor', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'owner3@test.juthoor', 'authenticated', 'authenticated');
UPDATE public.profiles SET is_admin = true  WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET is_admin = false WHERE id IN
  ('22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444');

-- ── two public trees ────────────────────────────────────────────────────────
INSERT INTO public.trees (id, name, owner_id, is_public) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'T1', '22222222-2222-2222-2222-222222222222', true),
  ('e0000000-0000-0000-0000-000000000002', 'T2', '33333333-3333-3333-3333-333333333333', true);

INSERT INTO public.places (id, name_ar, name_en) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'نابلس', 'Nablus');

-- ── persons: A (t1), B (t2), C (t1) deceased; D (t1); G (t2) LIVING ─────────
INSERT INTO public.persons (id, tree_id, gender, display_name_ar, display_name_en) VALUES
  ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'M', 'أحمد',  'Ahmad'),
  ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'M', 'بسام',  'Bassam'),
  ('30000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'M', 'جمال',  'Jamal'),
  ('d0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'M', 'داوود', 'Dawud'),
  ('a0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000002', 'M', 'غسان',  'Ghassan');

-- deceased: A, B, C carry a death event; G stays living (no event → fails-living).
INSERT INTO public.events (person_id, event_type) VALUES
  ('10000000-0000-0000-0000-000000000001', 'DEAT'),
  ('20000000-0000-0000-0000-000000000002', 'DEAT'),
  ('30000000-0000-0000-0000-000000000003', 'DEAT');

-- counterpart B carries features so the revealed card shows district + decade.
INSERT INTO public.match_features (person_id, tree_id, birth_year, origin_place_id) VALUES
  ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 1940,
   'f0000000-0000-0000-0000-000000000001');

-- ── matches: m1 = A↔B (deceased-public → revealed); m2 = A↔G (living → masked) ─
INSERT INTO public.matches (id, person_a_id, person_b_id, confidence_score, status, score_breakdown) VALUES
  ('c1000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 300, 'pending',
   '{"meta":{"version":"frs-v1","vetoes":["mother_disagree"]},"params":{"given":{"w":10,"pts":10},"surname":{"w":10,"pts":0},"mother":{"w":20,"pts":0}}}'),
  ('c2000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 200, 'pending',
   '{"meta":{"vetoes":[]},"params":{"given":{"w":10,"pts":5}}}');

-- ── links: confirmed A-B, B-C (one component); proposed A-D (must NOT group) ──
INSERT INTO public.person_links (person_a_id, person_b_id, status) VALUES
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'confirmed'),
  ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'confirmed'),
  ('10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', 'proposed');

-- ── an in-app notification + an owner hint for owner1 ───────────────────────
INSERT INTO public.notifications (recipient_user_id, kind, match_id) VALUES
  ('22222222-2222-2222-2222-222222222222', 'match_found', 'c1000000-0000-0000-0000-000000000001');
INSERT INTO public.match_hints (match_id, owner_user_id, counterpart_person_id) VALUES
  ('c1000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   '20000000-0000-0000-0000-000000000002');

-- ── 1-9. objects exist ──────────────────────────────────────────────────────
SELECT ok(EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='person_links'),  'person_links table exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='merge_log'),      'merge_log table exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='match_audit'),    'match_audit table exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='notifications'),  'notifications table exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='contact_relay'),  'contact_relay table exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='match_hints'),    'match_hints table exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='person_identity_groups'), 'person_identity_groups matview exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='match_review_cards'),   'match_review_cards view exists');
SELECT ok(EXISTS(SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='v_match_explanations'), 'v_match_explanations view exists');

-- ── 10. person_links is admin-only (owner2 owns B but reads 0) ───────────────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.person_links), 0, 'non-admin owner cannot read the person_links linkage graph');

-- ── 11. notifications: owner1 reads exactly own ─────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.notifications), 1, 'owner1 reads own notification');

-- ── 12-14. match1 card (owner1): deceased-public counterpart is REVEALED ─────
SELECT is((SELECT counterpart_masked FROM public.match_review_cards
           WHERE match_id='c1000000-0000-0000-0000-000000000001'
             AND viewer_person_id='10000000-0000-0000-0000-000000000001'),
          false, 'deceased-public counterpart card is not masked');
SELECT is((SELECT counterpart_initials FROM public.match_review_cards
           WHERE match_id='c1000000-0000-0000-0000-000000000001'
             AND viewer_person_id='10000000-0000-0000-0000-000000000001'),
          'B.', 'revealed card shows counterpart initials only');
SELECT is((SELECT counterpart_decade FROM public.match_review_cards
           WHERE match_id='c1000000-0000-0000-0000-000000000001'
             AND viewer_person_id='10000000-0000-0000-0000-000000000001'),
          1940, 'revealed card shows counterpart decade (not exact year)');

-- ── 15-16. match2 card (owner1): living counterpart is fully REDACTED ────────
SELECT is((SELECT counterpart_masked FROM public.match_review_cards
           WHERE match_id='c2000000-0000-0000-0000-000000000002'
             AND viewer_person_id='10000000-0000-0000-0000-000000000001'),
          true, 'living counterpart card is masked');
SELECT is((SELECT counterpart_label_en FROM public.match_review_cards
           WHERE match_id='c2000000-0000-0000-0000-000000000002'
             AND viewer_person_id='10000000-0000-0000-0000-000000000001'),
          'Hidden relative', 'living counterpart renders the redacted token');

-- ── 17. a non-involved owner sees no cards ──────────────────────────────────
SELECT set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.match_review_cards), 0, 'non-involved owner sees zero review cards');

-- ── 18-20. field agreement: agree / disagree / suppressed-for-living ─────────
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT is((SELECT field_agreement->>'given' FROM public.match_review_cards
           WHERE match_id='c1000000-0000-0000-0000-000000000001'
             AND viewer_person_id='10000000-0000-0000-0000-000000000001'),
          'agree', 'field_agreement marks a positive-points field as agree');
SELECT is((SELECT field_agreement->>'mother' FROM public.match_review_cards
           WHERE match_id='c1000000-0000-0000-0000-000000000001'
             AND viewer_person_id='10000000-0000-0000-0000-000000000001'),
          'disagree', 'field_agreement marks a veto field as disagree');
SELECT ok((SELECT field_agreement FROM public.match_review_cards
           WHERE match_id='c2000000-0000-0000-0000-000000000002'
             AND viewer_person_id='10000000-0000-0000-0000-000000000001') IS NULL,
          'field_agreement suppressed entirely when a living person is involved');

-- ── 21. v_match_explanations: admin sees only agreeing fields on deceased-public ─
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.v_match_explanations
           WHERE match_id='c1000000-0000-0000-0000-000000000001'),
          1, 'v_match_explanations flattens only the agreeing field (given) for admin');

-- ── 22-24. person_identity_groups union-find over CONFIRMED links ────────────
RESET ROLE;
SELECT public.refresh_person_identity_groups(false);
SELECT is((SELECT canonical_person_id FROM public.person_identity_groups
           WHERE person_id='10000000-0000-0000-0000-000000000001'),
          '10000000-0000-0000-0000-000000000001'::uuid, 'A canonical = min of its component');
SELECT is((SELECT canonical_person_id FROM public.person_identity_groups
           WHERE person_id='30000000-0000-0000-0000-000000000003'),
          '10000000-0000-0000-0000-000000000001'::uuid, 'C (A-B-C chain) shares A''s canonical');
SELECT is((SELECT count(*)::int FROM public.person_identity_groups
           WHERE person_id='d0000000-0000-0000-0000-000000000004'),
          0, 'a person with only a PROPOSED link is not in the overlay');

-- ── 25. status-transition trigger writes match_audit ────────────────────────
UPDATE public.matches SET status='deferred' WHERE id='c1000000-0000-0000-0000-000000000001';
SELECT is((SELECT count(*)::int FROM public.match_audit
           WHERE match_id='c1000000-0000-0000-0000-000000000001'),
          1, 'a match status change appends one match_audit row');

-- ── 26-27. match_hints is per-owner ─────────────────────────────────────────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.match_hints), 1, 'owner1 sees their own hint');
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.match_hints), 0, 'owner2 does not see owner1''s hint');

SELECT finish();
ROLLBACK;
