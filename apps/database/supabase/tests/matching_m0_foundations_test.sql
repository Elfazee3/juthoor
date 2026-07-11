-- pgTAP: M0 foundation tables (plan §6/§7-M0).
BEGIN;
SELECT plan(8);

SELECT has_table('public', 'app_settings',          'app_settings table exists');
SELECT has_table('public', 'matching_runs',         'matching_runs table exists');
SELECT has_table('public', 'person_privacy_holds',  'person_privacy_holds table exists');

-- Single-row config with the safe defaults (the kill switch is OFF).
SELECT is((SELECT count(*)::int FROM public.app_settings), 1, 'app_settings has exactly one row');
SELECT is((SELECT auto_merge_enabled FROM public.app_settings), false, 'auto_merge_enabled defaults false (shadow mode)');
SELECT is((SELECT auto_merge_threshold FROM public.app_settings), 450, 'auto_merge_threshold defaults 450');
SELECT is((SELECT score_pct_floor FROM public.app_settings), 0.78, 'score_pct_floor defaults 0.78');

-- RLS: a non-admin authenticated user cannot read the config.
INSERT INTO auth.users (id, email, aud, role) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'nonadmin@test.juthoor', 'authenticated', 'authenticated');

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"e0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

SELECT is((SELECT count(*)::int FROM public.app_settings), 0, 'non-admin reads 0 rows from app_settings');

SELECT finish();
ROLLBACK;
