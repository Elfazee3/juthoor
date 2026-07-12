-- pgTAP: search_master_tree masks a living person's birth_year + origin for a
-- non-privileged viewer, but reveals them to the owner (plan §5.5 / B6b).
BEGIN;
SELECT plan(7);

-- ── Fixtures (superuser) ─────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'owner@test.juthoor',  'authenticated', 'authenticated'),
  ('f0000000-0000-0000-0000-000000000002', 'viewer@test.juthoor', 'authenticated', 'authenticated');

INSERT INTO public.trees (id, name, owner_id, is_public) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'Public Tree', 'f0000000-0000-0000-0000-000000000001', true);

INSERT INTO public.places (id, name_ar, name_en) VALUES
  ('f2000000-0000-0000-0000-000000000001', 'اللد', 'Lydda');

-- A LIVING person (BIRT 2000, no DEAT) with an origin place, in the public tree.
INSERT INTO public.persons (id, tree_id, gender, display_name_ar) VALUES
  ('f3000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'M', 'بشار');
INSERT INTO public.person_names (person_id, is_primary, given_name, surname) VALUES
  ('f3000000-0000-0000-0000-000000000001', true, 'بشار', 'الخطيب');
INSERT INTO public.events (person_id, event_type, date_year, place_id) VALUES
  ('f3000000-0000-0000-0000-000000000001', 'BIRT', 2000, 'f2000000-0000-0000-0000-000000000001');

-- ── Non-privileged viewer (not owner, not member) ────────────────────────────
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

SELECT is(
  (SELECT birth_year FROM public.search_master_tree('بشار')
     WHERE person_id = 'f3000000-0000-0000-0000-000000000001'),
  NULL, 'living person birth_year masked for non-privileged searcher');

SELECT is(
  (SELECT origin_place_id FROM public.search_master_tree('بشار')
     WHERE person_id = 'f3000000-0000-0000-0000-000000000001'),
  NULL, 'living person origin_place_id masked for non-privileged searcher');

SELECT is(
  (SELECT origin_name_ar FROM public.search_master_tree('بشار')
     WHERE person_id = 'f3000000-0000-0000-0000-000000000001'),
  NULL, 'living person origin_name_ar masked for non-privileged searcher');

SELECT is(
  (SELECT display_name_ar FROM public.search_master_tree('بشار')
     WHERE person_id = 'f3000000-0000-0000-0000-000000000001'),
  'بشار', 'name is still shown in a public tree (only life data is masked)');

SELECT is(
  (SELECT tree_is_accessible FROM public.search_master_tree('بشار')
     WHERE person_id = 'f3000000-0000-0000-0000-000000000001'),
  true, 'public tree is accessible to the viewer');

-- ── Owner (privileged) sees the life data ────────────────────────────────────
SELECT set_config('request.jwt.claims',
  '{"sub":"f0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT is(
  (SELECT birth_year FROM public.search_master_tree('بشار')
     WHERE person_id = 'f3000000-0000-0000-0000-000000000001')::int,
  2000, 'owner sees the living person birth_year');

SELECT is(
  (SELECT origin_name_ar FROM public.search_master_tree('بشار')
     WHERE person_id = 'f3000000-0000-0000-0000-000000000001'),
  'اللد', 'owner sees the living person origin');

SELECT finish();
ROLLBACK;
