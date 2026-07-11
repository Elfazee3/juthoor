-- pgTAP: M1 feature-layer tables, deny-all RLS, and the derivation triggers
-- that feed the dirty queue (plan §6/§7-M1).
BEGIN;
SELECT plan(6);

SELECT has_table('public', 'match_features',       'match_features table exists');
SELECT has_table('public', 'match_features_dirty', 'match_features_dirty table exists');

-- Fixtures
INSERT INTO auth.users (id, email, aud, role) VALUES
  ('10000000-0000-0000-0000-000000000001', 'owner@test.juthoor',  'authenticated', 'authenticated'),
  ('10000000-0000-0000-0000-000000000002', 'viewer@test.juthoor', 'authenticated', 'authenticated');
INSERT INTO public.trees (id, name, owner_id, is_public) VALUES
  ('20000000-0000-0000-0000-000000000001', 'T', '10000000-0000-0000-0000-000000000001', true);

-- Inserting a person fires the trigger → it lands in the dirty queue.
INSERT INTO public.persons (id, tree_id, gender, display_name_ar) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'M', 'أب'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'M', 'ابن');
SELECT is(
  (SELECT count(*)::int FROM public.match_features_dirty WHERE person_id = '30000000-0000-0000-0000-000000000001'),
  1, 'inserting a person enqueues it in match_features_dirty');

-- A person_name edit enqueues that person.
DELETE FROM public.match_features_dirty;
INSERT INTO public.person_names (person_id, is_primary, given_name) VALUES
  ('30000000-0000-0000-0000-000000000002', true, 'ابن');
SELECT is(
  (SELECT count(*)::int FROM public.match_features_dirty WHERE person_id = '30000000-0000-0000-0000-000000000002'),
  1, 'a person_names edit enqueues that person');

-- A family_children edit enqueues the child (their parent/grandparent features change).
INSERT INTO public.families (id, tree_id, partner1_id) VALUES
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001');
DELETE FROM public.match_features_dirty;
INSERT INTO public.family_children (family_id, child_id) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002');
SELECT is(
  (SELECT count(*)::int FROM public.match_features_dirty WHERE person_id = '30000000-0000-0000-0000-000000000002'),
  1, 'a family_children edit enqueues the child');

-- Deny-all RLS: engine-internal table is invisible to a non-admin user.
INSERT INTO public.match_features (person_id, tree_id) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*)::int FROM public.match_features),
  0, 'deny-all RLS: non-admin reads 0 rows from match_features');

SELECT finish();
ROLLBACK;
