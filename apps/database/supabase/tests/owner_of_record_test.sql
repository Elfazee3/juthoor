-- pgTAP: decision D1 — the owner of a record controls the non-mandatory information of a living
-- person. Others in the tree see only the mandatory part; the IFT Administrator keeps control
-- until an account is linked, then needs the owner's grant to edit.
BEGIN;
SELECT plan(33);

INSERT INTO auth.users (id, email, aud, role) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'platform@test.juthoor', 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000002', 'ifta@test.juthoor',     'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000003', 'collab@test.juthoor',   'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000004', 'reader@test.juthoor',   'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000005', 'me@test.juthoor',       'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000006', 'stranger@test.juthoor', 'authenticated', 'authenticated');
UPDATE public.profiles SET is_admin = (id = 'a1000000-0000-0000-0000-000000000001')
 WHERE id::text LIKE 'a1000000-%';
INSERT INTO public.trees (id, name, owner_id, is_public) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'T1', 'a1000000-0000-0000-0000-000000000002', false);
INSERT INTO public.tree_members (tree_id, user_id, role, status) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'collaborator', 'approved'),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'read_only',    'approved'),
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'read_only',    'approved');

-- L: living (no death, no birth 150 years ago). S: her living spouse. D: deceased (death event).
INSERT INTO public.persons (id, tree_id, gender) VALUES
  ('c1000000-0000-0000-0000-00000000000a', 'b1000000-0000-0000-0000-000000000001', 'F'),
  ('c1000000-0000-0000-0000-00000000000b', 'b1000000-0000-0000-0000-000000000001', 'M'),
  ('c1000000-0000-0000-0000-00000000000d', 'b1000000-0000-0000-0000-000000000001', 'M');
INSERT INTO public.person_names (person_id, is_primary, given_name, surname) VALUES
  ('c1000000-0000-0000-0000-00000000000a', true,  'ليلى', 'الخطيب'),
  ('c1000000-0000-0000-0000-00000000000a', false, 'لولو', NULL),
  ('c1000000-0000-0000-0000-00000000000d', true,  'سالم', 'الخطيب'),
  ('c1000000-0000-0000-0000-00000000000d', false, 'أبو خالد', NULL);
INSERT INTO public.families (id, tree_id, partner1_id, partner2_id) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-00000000000b', 'c1000000-0000-0000-0000-00000000000a');
INSERT INTO public.events (person_id, family_id, event_type, date_year) VALUES
  ('c1000000-0000-0000-0000-00000000000a', NULL, 'BIRT', 1980),
  ('c1000000-0000-0000-0000-00000000000a', NULL, 'RESI', 2019),
  ('c1000000-0000-0000-0000-00000000000d', NULL, 'BIRT', 1920),
  ('c1000000-0000-0000-0000-00000000000d', NULL, 'DEAT', 1990),
  ('c1000000-0000-0000-0000-00000000000d', NULL, 'RESI', 1960),
  (NULL, 'd1000000-0000-0000-0000-000000000001', 'MARR', 2005);
INSERT INTO public.person_notes (person_id, body) VALUES
  ('c1000000-0000-0000-0000-00000000000a', 'note about L'),
  ('c1000000-0000-0000-0000-00000000000d', 'note about D');
INSERT INTO public.person_attachments (person_id, kind, tag, storage_path, mime_type, size_bytes) VALUES
  ('c1000000-0000-0000-0000-00000000000a', 'photo', 'portrait', 'b1/L.jpg', 'image/jpeg', 100),
  ('c1000000-0000-0000-0000-00000000000d', 'photo', 'portrait', 'b1/D.jpg', 'image/jpeg', 100);

-- 1. a reader sees the mandatory part of the living person, not the rest
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.events WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), 1,
  'a reader sees only the birth event of a living person');
SELECT is((SELECT count(*)::int FROM public.events WHERE family_id = 'd1000000-0000-0000-0000-000000000001'), 0,
  'a reader does not see the marriage of living partners');
SELECT is((SELECT count(*)::int FROM public.person_names WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), 1,
  'a reader sees only the primary name of a living person');
SELECT is((SELECT count(*)::int FROM public.person_notes WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), 0,
  'a reader does not see the notes of a living person');
SELECT is((SELECT count(*)::int FROM public.person_attachments WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), 0,
  'a reader does not see the photos of a living person');
-- ... but everything of a deceased person
SELECT is((SELECT count(*)::int FROM public.events WHERE person_id = 'c1000000-0000-0000-0000-00000000000d'), 3,
  'a reader sees every event of a deceased person');
SELECT is((SELECT count(*)::int FROM public.person_notes WHERE person_id = 'c1000000-0000-0000-0000-00000000000d'), 1,
  'and the notes of a deceased person');
SELECT is((SELECT count(*)::int FROM public.person_attachments WHERE person_id = 'c1000000-0000-0000-0000-00000000000d'), 1,
  'and the photos of a deceased person');

-- 2. a collaborator also sees only the mandatory part, and cannot add non-mandatory events
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.events WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), 1,
  'a collaborator sees only the birth event of a living person');
SELECT throws_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000a', 'BAPM', 2020) $$,
  '42501', NULL, 'a collaborator cannot add a non-mandatory event for a living person');
SELECT lives_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000a', 'BIRT', 1981) $$,
  'a collaborator can still record a birth');
SELECT throws_ok($$ INSERT INTO public.person_names (person_id, is_primary, given_name) VALUES ('c1000000-0000-0000-0000-00000000000a', false, 'x') $$,
  '42501', NULL, 'a collaborator cannot add an extra name for a living person');
SELECT lives_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000d', 'BAPM', 1950) $$,
  'a collaborator can add events for a deceased person');

-- 3. the IFT Administrator keeps control while no account is linked
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT cmp_ok((SELECT count(*)::int FROM public.events WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), '>=', 2,
  'the IFT Administrator sees every event of a living person');
SELECT is((SELECT count(*)::int FROM public.person_notes WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), 1,
  'and the notes');
SELECT lives_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000a', 'BAPM', 2020) $$,
  'the IFT Administrator can add non-mandatory information while no account is linked');

-- 4. the Platform Administrator reads but does not edit
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.person_notes WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), 1,
  'the Platform Administrator reads a living person''s notes');
SELECT throws_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000a', 'EMIG', 2000) $$,
  '42501', NULL, 'but cannot edit them');

-- 5. claiming a record
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000006","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT public.claim_person('c1000000-0000-0000-0000-00000000000a') $$,
  '42501', 'not_authorized', 'someone with no access to the tree cannot claim a person in it');
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT public.claim_person('c1000000-0000-0000-0000-00000000000d') $$,
  '22023', 'person_not_living', 'a deceased person cannot be claimed');
SELECT lives_ok($$ SELECT public.claim_person('c1000000-0000-0000-0000-00000000000a') $$, 'a member claims a living person');
SELECT throws_ok($$ SELECT public.claim_person('c1000000-0000-0000-0000-00000000000b') $$,
  '23505', 'account_already_linked', 'an account links to one person only');
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT public.claim_person('c1000000-0000-0000-0000-00000000000a') $$,
  '23505', 'already_claimed', 'a claimed person cannot be claimed again');
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
UPDATE public.persons SET owner_user_id = 'a1000000-0000-0000-0000-000000000006' WHERE id = 'c1000000-0000-0000-0000-00000000000a';
RESET ROLE;
SELECT is((SELECT owner_user_id FROM public.persons WHERE id = 'c1000000-0000-0000-0000-00000000000a'),
  'a1000000-0000-0000-0000-000000000005'::uuid, 'the owner of a record cannot be changed by a direct update');

-- 6. the owner of the record edits their own information, though only a reader of the tree
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT lives_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000a', 'EMIG', 2001) $$,
  'the owner of the record adds their own non-mandatory information');
SELECT is((SELECT count(*)::int FROM public.person_notes WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), 1,
  'and reads their notes');

-- 7. once an account is linked, the IFT Administrator still reads but needs a grant to edit
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT cmp_ok((SELECT count(*)::int FROM public.events WHERE person_id = 'c1000000-0000-0000-0000-00000000000a'), '>=', 3,
  'the IFT Administrator still reads a claimed person''s information');
SELECT throws_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000a', 'BAPM', 2022) $$,
  '42501', NULL, 'but cannot edit it without the owner''s permission');
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT throws_ok($$ SELECT public.grant_person_access('c1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000006') $$,
  '22023', 'grantee_not_in_tree', 'a permission can be given only to someone who works on the tree');
SELECT lives_ok($$ SELECT public.grant_person_access('c1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000002') $$,
  'the owner gives the IFT Administrator permission');
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT lives_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000a', 'BAPM', 2022) $$,
  'with the permission the IFT Administrator can edit');
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT public.revoke_person_access('c1000000-0000-0000-0000-00000000000a', 'a1000000-0000-0000-0000-000000000002');
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT throws_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000a', 'BAPM', 2023) $$,
  '42501', NULL, 'revoking the permission ends it');

-- 8. releasing the record gives control back to the IFT Administrator
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000005","role":"authenticated"}', true);
SELECT public.release_person('c1000000-0000-0000-0000-00000000000a');
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
SELECT lives_ok($$ INSERT INTO public.events (person_id, event_type, date_year) VALUES ('c1000000-0000-0000-0000-00000000000a', 'BAPM', 2024) $$,
  'after the owner releases the record the IFT Administrator edits again');
RESET ROLE;

SELECT finish();
ROLLBACK;
