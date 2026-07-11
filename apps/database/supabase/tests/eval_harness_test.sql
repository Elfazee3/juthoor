-- pgTAP: the eval harness (plan §7-M2, B13).
BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email, aud, role) VALUES
  ('a7000000-0000-0000-0000-000000000001', 'o1@test.juthoor', 'authenticated', 'authenticated'),
  ('a7000000-0000-0000-0000-000000000002', 'o2@test.juthoor', 'authenticated', 'authenticated');
INSERT INTO public.trees (id, name, owner_id) VALUES
  ('e7000000-0000-0000-0000-000000000001', 'T1', 'a7000000-0000-0000-0000-000000000001'),
  ('e7000000-0000-0000-0000-000000000002', 'T2', 'a7000000-0000-0000-0000-000000000002');

-- a true cross-tree MATCH pair (rich) and a clear NON-MATCH pair
INSERT INTO public.persons (id, tree_id, gender) VALUES
  ('10000000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-000000000001', 'M'),  -- pM1
  ('20000000-0000-0000-0000-000000000002', 'e7000000-0000-0000-0000-000000000002', 'M'),  -- pM2
  ('30000000-0000-0000-0000-000000000003', 'e7000000-0000-0000-0000-000000000001', 'M'),  -- pN1
  ('40000000-0000-0000-0000-000000000004', 'e7000000-0000-0000-0000-000000000002', 'M');  -- pN2

INSERT INTO public.match_features (person_id, tree_id, given_phon, surname_phon, father_phon, birth_year) VALUES
  ('10000000-0000-0000-0000-000000000001', 'e7000000-0000-0000-0000-000000000001', 'ibrahim', 'khatib', 'muhammad', 1950),
  ('20000000-0000-0000-0000-000000000002', 'e7000000-0000-0000-0000-000000000002', 'ibrahim', 'khatib', 'muhammad', 1950),
  ('30000000-0000-0000-0000-000000000003', 'e7000000-0000-0000-0000-000000000001', 'zayd',    'najjar', 'saeed',    1970),
  ('40000000-0000-0000-0000-000000000004', 'e7000000-0000-0000-0000-000000000002', 'omar',    'darwish','hani',     1988);

INSERT INTO public.eval_pairs (person_a_id, person_b_id, label, is_cross_script, source) VALUES
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'match', true, 'fixture'),
  ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000004', 'non_match', false, 'fixture');

SELECT has_table('public', 'eval_pairs', 'eval_pairs table exists');
SELECT has_table('public', 'eval_runs',  'eval_runs table exists');

SELECT ok(public.run_eval('frs-v1-test') IS NOT NULL, 'run_eval completes and returns a run id');

SELECT cmp_ok((SELECT recall FROM public.eval_runs LIMIT 1),
  '>=', 0.99, 'recall = 1 at the best-F1 threshold (the match is caught)');
SELECT cmp_ok((SELECT precision FROM public.eval_runs LIMIT 1),
  '>=', 0.99, 'precision = 1 (the non-match is below threshold)');
SELECT cmp_ok((SELECT cross_script_recall FROM public.eval_runs LIMIT 1),
  '>=', 0.99, 'cross_script_recall = 1 (the cross-script match is caught)');

SELECT finish();
ROLLBACK;
