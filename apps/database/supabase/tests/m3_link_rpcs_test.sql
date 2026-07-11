-- pgTAP: M3 link/resolve RPCs (B15, plan §6 RPCs, §5.2/5.3 consent model).
BEGIN;
SELECT plan(23);

-- ── users + two public trees ────────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@t.juthoor',  'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'owner1@t.juthoor', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'owner2@t.juthoor', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'owner3@t.juthoor', 'authenticated', 'authenticated');
UPDATE public.profiles SET is_admin = (id = '11111111-1111-1111-1111-111111111111')
  WHERE id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
               '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444');
INSERT INTO public.trees (id, name, owner_id, is_public) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'T1', '22222222-2222-2222-2222-222222222222', true),
  ('e0000000-0000-0000-0000-000000000002', 'T2', '33333333-3333-3333-3333-333333333333', true);

-- persons: t1 side (a) and t2 side (b) for five cross-tree pairs.
INSERT INTO public.persons (id, tree_id, gender) VALUES
  ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'M'), -- A dead
  ('20000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'M'), -- B dead
  ('11000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'M'), -- C dead
  ('21000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'M'), -- D dead
  ('12000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'M'), -- E dead
  ('22000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002', 'M'), -- F LIVING
  ('13000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000001', 'M'), -- G LIVING
  ('23000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000002', 'M'), -- H LIVING
  ('14000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000001', 'M'), -- I dead
  ('24000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000002', 'M'); -- J dead
INSERT INTO public.events (person_id, event_type) VALUES
  ('10000000-0000-0000-0000-000000000001','DEAT'), ('20000000-0000-0000-0000-000000000002','DEAT'),
  ('11000000-0000-0000-0000-000000000003','DEAT'), ('21000000-0000-0000-0000-000000000004','DEAT'),
  ('12000000-0000-0000-0000-000000000005','DEAT'),
  ('14000000-0000-0000-0000-000000000009','DEAT'), ('24000000-0000-0000-0000-00000000000a','DEAT');

INSERT INTO public.matches (id, person_a_id, person_b_id, confidence_score, status) VALUES
  ('c1000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002',300,'pending'),
  ('c2000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000003','21000000-0000-0000-0000-000000000004',300,'pending'),
  ('c3000000-0000-0000-0000-000000000003','12000000-0000-0000-0000-000000000005','22000000-0000-0000-0000-000000000006',300,'pending'),
  ('c4000000-0000-0000-0000-000000000004','13000000-0000-0000-0000-000000000007','23000000-0000-0000-0000-000000000008',300,'pending'),
  ('c5000000-0000-0000-0000-000000000005','14000000-0000-0000-0000-000000000009','24000000-0000-0000-0000-00000000000a',300,'pending');
-- a fixed-id proposed link (I,J) for the authorization + reject tests.
INSERT INTO public.person_links (id, person_a_id, person_b_id, status, source_match_id) VALUES
  ('a1a1a1a1-1111-1111-1111-111111111111','14000000-0000-0000-0000-000000000009','24000000-0000-0000-0000-00000000000a','proposed','c5000000-0000-0000-0000-000000000005');

-- ── 1. a non-admin cannot resolve_match ─────────────────────────────────────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT public.resolve_match('c1000000-0000-0000-0000-000000000001','approve') $$,
  '42501', 'not_authorized', 'a non-admin cannot resolve_match');

-- ── admin approves the deceased pair m1 → direct fuse ───────────────────────
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT public.resolve_match('c1000000-0000-0000-0000-000000000001','approve','looks right');
RESET ROLE;

SELECT is((SELECT status::text FROM public.matches WHERE id='c1000000-0000-0000-0000-000000000001'),
          'admin_approved', 'approve flips the match to admin_approved');
SELECT is((SELECT status::text FROM public.person_links
           WHERE person_a_id='10000000-0000-0000-0000-000000000001'
             AND person_b_id='20000000-0000-0000-0000-000000000002'),
          'confirmed', 'approving a deceased pair confirms the same_as link directly');
SELECT is((SELECT count(*)::int FROM public.notifications
           WHERE match_id='c1000000-0000-0000-0000-000000000001' AND kind='connection_confirmed'),
          2, 'both owners get a connection_confirmed notification');
SELECT public.refresh_person_identity_groups(false);
SELECT is((SELECT canonical_person_id FROM public.person_identity_groups
           WHERE person_id='10000000-0000-0000-0000-000000000001'),
          '10000000-0000-0000-0000-000000000001'::uuid, 'confirmed pair appears in the overlay');

-- teardown fixtures for revoke: a relay token + a cached degree path on A.
INSERT INTO public.contact_relay (match_id, from_user_id, to_user_id) VALUES
  ('c1000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
INSERT INTO public.match_paths (source_person_id, target_person_id, degrees, path_json) VALUES
  ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002', 2, '[]'::jsonb);

-- ── admin revokes m1's link → full teardown ─────────────────────────────────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT public.revoke_person_link((SELECT id FROM public.person_links
  WHERE person_a_id='10000000-0000-0000-0000-000000000001' AND person_b_id='20000000-0000-0000-0000-000000000002'));
RESET ROLE;

SELECT is((SELECT status::text FROM public.person_links
           WHERE person_a_id='10000000-0000-0000-0000-000000000001'
             AND person_b_id='20000000-0000-0000-0000-000000000002'),
          'revoked', 'revoke flips the link to revoked');
SELECT is((SELECT count(*)::int FROM public.notifications
           WHERE match_id='c1000000-0000-0000-0000-000000000001'),
          0, 'revoke retracts the notifications tied to the link');
SELECT ok((SELECT revoked_at FROM public.contact_relay
           WHERE match_id='c1000000-0000-0000-0000-000000000001') IS NOT NULL,
          'revoke expires the contact_relay token');
SELECT is((SELECT count(*)::int FROM public.match_paths
           WHERE source_person_id='10000000-0000-0000-0000-000000000001'),
          0, 'revoke invalidates cached degree paths through the pair');
SELECT ok(EXISTS(SELECT 1 FROM public.overlay_refresh_queue WHERE reason='revoke'),
          'revoke queues (not sync-runs) an overlay refresh');
SELECT public.refresh_person_identity_groups(false);
SELECT is((SELECT count(*)::int FROM public.person_identity_groups
           WHERE person_id='10000000-0000-0000-0000-000000000001'),
          0, 'after revoke + refresh the pair is re-isolated from the overlay');

-- ── admin defers the deceased pair m2 → owner hints ─────────────────────────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT public.resolve_match('c2000000-0000-0000-0000-000000000002','defer');
RESET ROLE;
SELECT is((SELECT status::text FROM public.matches WHERE id='c2000000-0000-0000-0000-000000000002'),
          'deferred', 'defer flips the match to deferred');
SELECT is((SELECT count(*)::int FROM public.match_hints WHERE match_id='c2000000-0000-0000-0000-000000000002'),
          2, 'defer creates one hint per owner');

-- ── both owners accept their hints → dual-owner confirm ─────────────────────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT public.resolve_match_hint((SELECT id FROM public.match_hints
  WHERE match_id='c2000000-0000-0000-0000-000000000002' AND owner_user_id='22222222-2222-2222-2222-222222222222'), true);
SELECT set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
SELECT public.resolve_match_hint((SELECT id FROM public.match_hints
  WHERE match_id='c2000000-0000-0000-0000-000000000002' AND owner_user_id='33333333-3333-3333-3333-333333333333'), true);
RESET ROLE;
SELECT is((SELECT status::text FROM public.person_links
           WHERE person_a_id='11000000-0000-0000-0000-000000000003'
             AND person_b_id='21000000-0000-0000-0000-000000000004'),
          'confirmed', 'dual-owner acceptance confirms the link');

-- ── admin approves a ONE-LIVING pair m3 → proposed + owner confirmation ─────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT public.resolve_match('c3000000-0000-0000-0000-000000000003','approve');
RESET ROLE;
SELECT is((SELECT status::text FROM public.person_links
           WHERE person_a_id='12000000-0000-0000-0000-000000000005'
             AND person_b_id='22000000-0000-0000-0000-000000000006'),
          'proposed', 'a living-involved pair is NEVER admin-fused: link stays proposed');
SELECT is((SELECT count(*)::int FROM public.match_hints WHERE match_id='c3000000-0000-0000-0000-000000000003'),
          2, 'a one-living pair still routes to dual-owner hints');
SELECT is((SELECT body_en FROM public.notifications WHERE match_id='c3000000-0000-0000-0000-000000000003' LIMIT 1),
          'No action needed.', 'a living-involved notification carries ZERO detail');

-- ── admin approves a BOTH-LIVING pair m4 → admin-only, no owner surface ──────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT public.resolve_match('c4000000-0000-0000-0000-000000000004','approve');
RESET ROLE;
SELECT is((SELECT status::text FROM public.person_links
           WHERE person_a_id='13000000-0000-0000-0000-000000000007'
             AND person_b_id='23000000-0000-0000-0000-000000000008'),
          'proposed', 'a both-living pair link stays proposed');
SELECT is((SELECT count(*)::int FROM public.match_hints WHERE match_id='c4000000-0000-0000-0000-000000000004'),
          0, 'a both-living pair creates NO owner hint (admin-only)');
SELECT is((SELECT count(*)::int FROM public.notifications WHERE match_id='c4000000-0000-0000-0000-000000000004'),
          0, 'a both-living pair sends NO owner notification (admin-only)');

-- ── reject_person_link (admin) ──────────────────────────────────────────────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT public.reject_person_link((SELECT id FROM public.person_links
  WHERE person_a_id='13000000-0000-0000-0000-000000000007' AND person_b_id='23000000-0000-0000-0000-000000000008'));
RESET ROLE;
SELECT is((SELECT status::text FROM public.person_links
           WHERE person_a_id='13000000-0000-0000-0000-000000000007'
             AND person_b_id='23000000-0000-0000-0000-000000000008'),
          'rejected', 'reject_person_link flips the link to rejected');

-- ── a stranger cannot revoke a link they are not party to ───────────────────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
SELECT throws_ok(
  $$ SELECT public.revoke_person_link('a1a1a1a1-1111-1111-1111-111111111111') $$,
  '42501', 'not_authorized', 'a non-party, non-admin cannot revoke a link');

-- ── resolve_match reject branch (admin) ─────────────────────────────────────
SELECT set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT public.resolve_match('c5000000-0000-0000-0000-000000000005','reject','not a match');
RESET ROLE;
SELECT is((SELECT status::text FROM public.matches WHERE id='c5000000-0000-0000-0000-000000000005'),
          'admin_rejected', 'reject flips the match to admin_rejected');

SELECT finish();
ROLLBACK;
