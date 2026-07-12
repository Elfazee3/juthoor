-- pgTAP: blocking + candidate generation (plan §7-M2, B11).
BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email, aud, role) VALUES
  ('a9000000-0000-0000-0000-000000000001', 'o1@test.juthoor', 'authenticated', 'authenticated'),
  ('a9000000-0000-0000-0000-000000000002', 'o2@test.juthoor', 'authenticated', 'authenticated');
INSERT INTO public.trees (id, name, owner_id) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'T1', 'a9000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000002', 'T2', 'a9000000-0000-0000-0000-000000000002');

INSERT INTO public.persons (id, tree_id, gender) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'M'),  -- pA (t1)
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'M'),  -- pB (t2, dup)
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'M'),  -- pC (t1, same tree)
  ('d0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'M');  -- pD (t2, privacy hold)

INSERT INTO public.match_features (person_id, tree_id, given_phon, surname_phon, privacy_hold) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'ahmad', 'khatib', false),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'ahmad', 'khatib', false),
  ('c0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'ahmad', 'khatib', false),
  ('d0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 'ahmad', 'khatib', true);

SELECT public.refresh_match_block_keys(true);

SELECT has_table('public', 'match_block_keys',  'match_block_keys table exists');
SELECT has_table('public', 'match_block_skips', 'match_block_skips table exists');

SELECT is(
  (SELECT block_key FROM public.match_block_keys WHERE person_id = 'a0000000-0000-0000-0000-000000000001' AND pass = 1),
  'ahmad|khatib', 'pass-1 phonetic given+surname block key built');

SELECT ok(
  EXISTS (SELECT 1 FROM public.generate_match_candidates()
          WHERE person_a_id = 'a0000000-0000-0000-0000-000000000001'
            AND person_b_id = 'b0000000-0000-0000-0000-000000000002'),
  'cross-tree duplicate is emitted as a candidate');

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.generate_match_candidates()
              WHERE person_a_id = 'a0000000-0000-0000-0000-000000000001'
                AND person_b_id = 'c0000000-0000-0000-0000-000000000003'),
  'same-tree pair is NOT a candidate (matching is cross-tree only)');

SELECT ok(
  NOT EXISTS (SELECT 1 FROM public.generate_match_candidates() c
              WHERE c.person_a_id = 'd0000000-0000-0000-0000-000000000004'
                 OR c.person_b_id = 'd0000000-0000-0000-0000-000000000004'),
  'privacy_hold person is excluded from all candidates');

SELECT finish();
ROLLBACK;
