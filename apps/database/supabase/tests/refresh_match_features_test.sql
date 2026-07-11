-- pgTAP: refresh_match_features derives the vector (parity with resolveParents),
-- folds names cross-script, and drains the dirty queue (plan §6/§7-M1, B8b).
BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id, email, aud, role) VALUES
  ('90000000-0000-0000-0000-000000000001', 'o@test.juthoor', 'authenticated', 'authenticated');
INSERT INTO public.trees (id, name, owner_id) VALUES
  ('91000000-0000-0000-0000-000000000001', 'T', '90000000-0000-0000-0000-000000000001');

-- grandpa(M) → father(M) + mother(F) → child(M); plus a Latin-named person.
INSERT INTO public.persons (id, tree_id, gender) VALUES
  ('92000000-0000-0000-0000-00000000000a', '91000000-0000-0000-0000-000000000001', 'M'),  -- grandpa
  ('92000000-0000-0000-0000-00000000000b', '91000000-0000-0000-0000-000000000001', 'M'),  -- father
  ('92000000-0000-0000-0000-00000000000c', '91000000-0000-0000-0000-000000000001', 'F'),  -- mother
  ('92000000-0000-0000-0000-00000000000d', '91000000-0000-0000-0000-000000000001', 'M'),  -- child
  ('92000000-0000-0000-0000-00000000000e', '91000000-0000-0000-0000-000000000001', 'M');  -- latin-named
INSERT INTO public.person_names (person_id, is_primary, given_name) VALUES
  ('92000000-0000-0000-0000-00000000000a', true, 'خليل'),
  ('92000000-0000-0000-0000-00000000000b', true, 'محمد'),
  ('92000000-0000-0000-0000-00000000000c', true, 'فاطمة'),
  ('92000000-0000-0000-0000-00000000000d', true, 'أحمد'),
  ('92000000-0000-0000-0000-00000000000e', true, 'Ibrahim');
INSERT INTO public.families (id, tree_id, partner1_id, partner2_id) VALUES
  ('93000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-00000000000a', NULL),
  ('93000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-00000000000b', '92000000-0000-0000-0000-00000000000c');
INSERT INTO public.family_children (family_id, child_id) VALUES
  ('93000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-00000000000b'),  -- father is grandpa's child
  ('93000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-00000000000d');  -- child is father+mother's child

-- resolveParents parity
SELECT is((SELECT father_id FROM public.match_resolve_parents('92000000-0000-0000-0000-00000000000d')),
  '92000000-0000-0000-0000-00000000000b'::uuid, 'father resolves to the M partner');
SELECT is((SELECT mother_id FROM public.match_resolve_parents('92000000-0000-0000-0000-00000000000d')),
  '92000000-0000-0000-0000-00000000000c'::uuid, 'mother resolves to the F partner');

-- Compute the child's vector
SELECT public.refresh_match_features('92000000-0000-0000-0000-00000000000d');

SELECT is((SELECT given_norm FROM public.match_features WHERE person_id='92000000-0000-0000-0000-00000000000d'),
  public.normalize_arabic('أحمد'), 'child given_norm folded');
SELECT is((SELECT father_norm FROM public.match_features WHERE person_id='92000000-0000-0000-0000-00000000000d'),
  public.normalize_arabic('محمد'), 'father_norm derived from resolved father');
SELECT is((SELECT pgf_norm FROM public.match_features WHERE person_id='92000000-0000-0000-0000-00000000000d'),
  public.normalize_arabic('خليل'), 'paternal grandfather (pgf_norm) derived two hops up');
SELECT is((SELECT num_children FROM public.match_features WHERE person_id='92000000-0000-0000-0000-00000000000d'),
  0, 'child has 0 children');
SELECT is((SELECT person_id FROM public.match_features_dirty WHERE person_id='92000000-0000-0000-0000-00000000000d'),
  NULL, 'refresh removed the person from the dirty queue');

-- cross-script: Latin "Ibrahim" folds to the Arabic key
SELECT public.refresh_match_features('92000000-0000-0000-0000-00000000000e');
SELECT is((SELECT given_norm FROM public.match_features WHERE person_id='92000000-0000-0000-0000-00000000000e'),
  public.normalize_arabic('ابراهيم'), 'Latin Ibrahim folds to the Arabic given_norm key');

SELECT finish();
ROLLBACK;
