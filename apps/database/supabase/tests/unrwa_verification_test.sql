-- pgTAP: an UNRWA card number counts only after a Platform Administrator verified it against the
-- attached card copy (D8, D9). Nobody else can set, keep or fake the verification.
BEGIN;
SELECT plan(21);

INSERT INTO auth.users (id, email, aud, role) VALUES
  ('b7000000-0000-0000-0000-000000000001', 'admin@test.juthoor', 'authenticated', 'authenticated'),
  ('b7000000-0000-0000-0000-000000000002', 'owner1@test.juthoor', 'authenticated', 'authenticated'),
  ('b7000000-0000-0000-0000-000000000003', 'owner2@test.juthoor', 'authenticated', 'authenticated');
UPDATE public.profiles SET is_admin = (id = 'b7000000-0000-0000-0000-000000000001')
 WHERE id IN ('b7000000-0000-0000-0000-000000000001','b7000000-0000-0000-0000-000000000002','b7000000-0000-0000-0000-000000000003');
INSERT INTO public.trees (id, name, owner_id) VALUES
  ('c7000000-0000-0000-0000-000000000001', 'T1', 'b7000000-0000-0000-0000-000000000002'),
  ('c7000000-0000-0000-0000-000000000002', 'T2', 'b7000000-0000-0000-0000-000000000003');
INSERT INTO public.persons (id, tree_id, gender) VALUES
  ('d7000000-0000-0000-0000-000000000001', 'c7000000-0000-0000-0000-000000000001', 'M'),
  ('d7000000-0000-0000-0000-000000000002', 'c7000000-0000-0000-0000-000000000002', 'M');
INSERT INTO public.person_names (person_id, is_primary, given_name, surname) VALUES
  ('d7000000-0000-0000-0000-000000000001', true, 'سامي', 'القاسم'),
  ('d7000000-0000-0000-0000-000000000002', true, 'محمود', 'الحداد');
INSERT INTO public.person_identifiers (person_id, kind, value) VALUES
  ('d7000000-0000-0000-0000-000000000001', 'unrwa_card', 'AB-1234'),
  ('d7000000-0000-0000-0000-000000000002', 'unrwa_card', 'AB1234');
INSERT INTO public.person_attachments (id, person_id, kind, tag, storage_path, mime_type, size_bytes) VALUES
  ('a7000000-0000-0000-0000-000000000001', 'd7000000-0000-0000-0000-000000000001', 'document', 'unrwa_card', 'c7000000-0000-0000-0000-000000000001/1.pdf', 'application/pdf', 1000),
  ('a7000000-0000-0000-0000-000000000002', 'd7000000-0000-0000-0000-000000000002', 'document', 'unrwa_card', 'c7000000-0000-0000-0000-000000000002/2.pdf', 'application/pdf', 1000);

INSERT INTO storage.objects (bucket_id, name, owner) VALUES
  ('person-attachments', 'c7000000-0000-0000-0000-000000000001/1.pdf', NULL), ('person-attachments', 'c7000000-0000-0000-0000-000000000001/other.pdf', NULL);

-- 1. a card copy alone is not enough
SELECT is(public.identifier_perfect_match('d7000000-0000-0000-0000-000000000001','d7000000-0000-0000-0000-000000000002'),
  NULL, 'an unverified card copy does not make a perfect match');

-- the administrator can open a card copy, but no other file, in a private tree
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b7000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id = 'person-attachments' AND name = 'c7000000-0000-0000-0000-000000000001/1.pdf'),
  1, 'an administrator can open an UNRWA card copy');
SELECT is((SELECT count(*)::int FROM storage.objects WHERE bucket_id = 'person-attachments' AND name = 'c7000000-0000-0000-0000-000000000001/other.pdf'),
  0, 'but not other files of a private tree');
RESET ROLE;

-- 2. the tree owner cannot verify, or fake it with a direct update
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b7000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT public.verify_identifier('d7000000-0000-0000-0000-000000000001','unrwa_card','a7000000-0000-0000-0000-000000000001') $$,
  '42501', 'not_authorized', 'a tree owner cannot verify a card');
SELECT throws_ok($$ SELECT * FROM public.list_identifier_queue() $$,
  '42501', 'not_authorized', 'a tree owner cannot read the verification queue');
UPDATE public.person_identifiers
   SET verified_at = now(), verified_attachment_id = 'a7000000-0000-0000-0000-000000000001'
 WHERE person_id = 'd7000000-0000-0000-0000-000000000001';
RESET ROLE;
SELECT is((SELECT verified_at FROM public.person_identifiers WHERE person_id = 'd7000000-0000-0000-0000-000000000001'),
  NULL, 'a direct update cannot set the verification');

-- 3. the administrator sees both numbers in the queue and verifies them
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b7000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.list_identifier_queue()), 2, 'both numbers wait in the queue');
SELECT throws_ok($$ SELECT public.verify_identifier('d7000000-0000-0000-0000-000000000001','unrwa_card','a7000000-0000-0000-0000-000000000002') $$,
  'P0002', 'no_card_copy', 'the copy must belong to the person');
SELECT public.verify_identifier('d7000000-0000-0000-0000-000000000001','unrwa_card','a7000000-0000-0000-0000-000000000001');
SELECT is((SELECT count(*)::int FROM public.list_identifier_queue()), 1, 'a verified number leaves the queue');
SELECT is(public.identifier_perfect_match('d7000000-0000-0000-0000-000000000001','d7000000-0000-0000-0000-000000000002'),
  NULL, 'one verified copy is not enough: both people need one');
SELECT public.verify_identifier('d7000000-0000-0000-0000-000000000002','unrwa_card','a7000000-0000-0000-0000-000000000002');
RESET ROLE;
SELECT is(public.identifier_perfect_match('d7000000-0000-0000-0000-000000000001','d7000000-0000-0000-0000-000000000002'),
  'unrwa_card', 'both verified: a perfect match');

-- 4. a tree owner changing the number voids the verification
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b7000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
UPDATE public.person_identifiers SET value = 'AB-1234'  -- same number, different spelling
 WHERE person_id = 'd7000000-0000-0000-0000-000000000001';
RESET ROLE;
SELECT isnt((SELECT verified_at FROM public.person_identifiers WHERE person_id = 'd7000000-0000-0000-0000-000000000001'),
  NULL, 're-saving the same number keeps the verification');
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b7000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
UPDATE public.person_identifiers SET value = 'AB-9999' WHERE person_id = 'd7000000-0000-0000-0000-000000000001';
RESET ROLE;
SELECT is((SELECT verified_at FROM public.person_identifiers WHERE person_id = 'd7000000-0000-0000-0000-000000000001'),
  NULL, 'a different number needs a fresh check');
SELECT is(public.identifier_perfect_match('d7000000-0000-0000-0000-000000000001','d7000000-0000-0000-0000-000000000002'),
  NULL, 'and no longer matches');

-- 5. swapping the verified file voids the check
UPDATE public.person_identifiers SET value = 'AB-1234' WHERE person_id = 'd7000000-0000-0000-0000-000000000001';
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b7000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT public.verify_identifier('d7000000-0000-0000-0000-000000000001','unrwa_card','a7000000-0000-0000-0000-000000000001');
RESET ROLE;
UPDATE public.person_attachments SET storage_path = 'c7000000-0000-0000-0000-000000000001/replaced.pdf' WHERE id = 'a7000000-0000-0000-0000-000000000001';
SELECT is((SELECT verified_attachment_id FROM public.person_identifiers WHERE person_id = 'd7000000-0000-0000-0000-000000000001'),
  NULL, 'replacing the card file voids the verification');
SELECT is((SELECT count(*)::int FROM public.person_identifiers WHERE verified_at IS NOT NULL AND verified_attachment_id IS NULL),
  0, 'no number is left verified without a file');

-- 6. reject takes a number out of the queue; a new copy puts it back
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b7000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT public.reject_identifier('d7000000-0000-0000-0000-000000000001','unrwa_card');
SELECT is((SELECT count(*)::int FROM public.list_identifier_queue() WHERE person_id = 'd7000000-0000-0000-0000-000000000001'),
  0, 'a rejected number leaves the queue');
RESET ROLE;
INSERT INTO public.person_attachments (person_id, kind, tag, storage_path, mime_type, size_bytes)
  VALUES ('d7000000-0000-0000-0000-000000000001', 'document', 'unrwa_card', 'c7000000-0000-0000-0000-000000000001/new.pdf', 'application/pdf', 1000);
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b7000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.list_identifier_queue() WHERE person_id = 'd7000000-0000-0000-0000-000000000001'),
  1, 'a new card copy puts the number back in the queue');
RESET ROLE;

-- 7. the 1948 family card works the same way, with its own card copy
INSERT INTO public.person_identifiers (person_id, kind, value)
  VALUES ('d7000000-0000-0000-0000-000000000002', 'family_card_1948', 'FC-12');
INSERT INTO public.person_attachments (id, person_id, kind, tag, storage_path, mime_type, size_bytes)
  VALUES ('a7000000-0000-0000-0000-000000000003', 'd7000000-0000-0000-0000-000000000002', 'document', 'family_card',
          'c7000000-0000-0000-0000-000000000002/fc.pdf', 'application/pdf', 1000);
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"b7000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT kind FROM public.list_identifier_queue() WHERE person_id = 'd7000000-0000-0000-0000-000000000002'
           AND kind = 'family_card_1948'), 'family_card_1948', 'a family-card number waits in the same queue');
SELECT throws_ok($$ SELECT public.verify_identifier('d7000000-0000-0000-0000-000000000002','family_card_1948','a7000000-0000-0000-0000-000000000002') $$,
  'P0002', 'no_card_copy', 'a family-card number needs a copy tagged as a family card, not an UNRWA card');
SELECT public.verify_identifier('d7000000-0000-0000-0000-000000000002','family_card_1948','a7000000-0000-0000-0000-000000000003');
RESET ROLE;
SELECT ok(public.person_identifier_verified('d7000000-0000-0000-0000-000000000002','family_card_1948'),
  'the administrator verifies the family-card number');

SELECT finish();
ROLLBACK;
