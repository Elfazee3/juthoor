-- pgTAP: score_pair refined gate — score_pct, disagreement vetoes, cluster
-- gating, decision (plan §4, B9b).
BEGIN;
SELECT plan(6);

INSERT INTO auth.users (id, email, aud, role) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'o1@test.juthoor', 'authenticated', 'authenticated'),
  ('d2000000-0000-0000-0000-000000000002', 'o2@test.juthoor', 'authenticated', 'authenticated');
INSERT INTO public.trees (id, name, owner_id) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'T1', 'd1000000-0000-0000-0000-000000000001'),
  ('e2000000-0000-0000-0000-000000000002', 'T2', 'd2000000-0000-0000-0000-000000000002');

-- 8 persons across two trees
INSERT INTO public.persons (id, tree_id, gender) VALUES
  ('f0000000-0000-0000-0000-0000000000a1', 'e1000000-0000-0000-0000-000000000001', 'M'),  -- dupA
  ('f0000000-0000-0000-0000-0000000000a2', 'e2000000-0000-0000-0000-000000000002', 'M'),  -- dupB
  ('f0000000-0000-0000-0000-0000000000b1', 'e1000000-0000-0000-0000-000000000001', 'M'),  -- momdiffA
  ('f0000000-0000-0000-0000-0000000000b2', 'e2000000-0000-0000-0000-000000000002', 'M'),  -- momdiffB
  ('f0000000-0000-0000-0000-0000000000c1', 'e1000000-0000-0000-0000-000000000001', 'M'),  -- livingA
  ('f0000000-0000-0000-0000-0000000000c2', 'e2000000-0000-0000-0000-000000000002', 'M'),  -- livingB (living)
  ('f0000000-0000-0000-0000-0000000000d1', 'e1000000-0000-0000-0000-000000000001', 'M'),  -- patriA
  ('f0000000-0000-0000-0000-0000000000d2', 'e2000000-0000-0000-0000-000000000002', 'M');  -- patriB

-- helper values: rich duplicate feature set (patriline + maternal + anchor)
INSERT INTO public.match_features (person_id, tree_id, gender, is_living,
  given_norm, given_phon, surname_norm, surname_phon, father_norm, father_phon,
  mother_norm, mother_phon, mgf_norm, mgf_phon, pgf_norm, pgf_phon, birth_year, birth_place_id) VALUES
  ('f0000000-0000-0000-0000-0000000000a1','e1000000-0000-0000-0000-000000000001','M',false,
   public.normalize_arabic('احمد'),public.arabic_phonetic('احمد'),public.normalize_arabic('خطيب'),public.arabic_phonetic('خطيب'),
   public.normalize_arabic('محمد'),public.arabic_phonetic('محمد'),public.normalize_arabic('فاطمة'),public.arabic_phonetic('فاطمة'),
   public.normalize_arabic('سالم'),public.arabic_phonetic('سالم'),NULL,NULL,1950,'e1000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-0000000000a2','e2000000-0000-0000-0000-000000000002','M',false,
   public.normalize_arabic('احمد'),public.arabic_phonetic('احمد'),public.normalize_arabic('خطيب'),public.arabic_phonetic('خطيب'),
   public.normalize_arabic('محمد'),public.arabic_phonetic('محمد'),public.normalize_arabic('فاطمة'),public.arabic_phonetic('فاطمة'),
   public.normalize_arabic('سالم'),public.arabic_phonetic('سالم'),NULL,NULL,1950,'e1000000-0000-0000-0000-000000000001'),
  -- momdiff: same given+father, DIFFERENT mother
  ('f0000000-0000-0000-0000-0000000000b1','e1000000-0000-0000-0000-000000000001','M',false,
   public.normalize_arabic('احمد'),public.arabic_phonetic('احمد'),NULL,NULL,public.normalize_arabic('محمد'),public.arabic_phonetic('محمد'),
   public.normalize_arabic('فاطمة'),public.arabic_phonetic('فاطمة'),NULL,NULL,NULL,NULL,NULL,NULL),
  ('f0000000-0000-0000-0000-0000000000b2','e2000000-0000-0000-0000-000000000002','M',false,
   public.normalize_arabic('احمد'),public.arabic_phonetic('احمد'),NULL,NULL,public.normalize_arabic('محمد'),public.arabic_phonetic('محمد'),
   public.normalize_arabic('ليلى'),public.arabic_phonetic('ليلى'),NULL,NULL,NULL,NULL,NULL,NULL),
  -- living: same rich set, but livingB is living
  ('f0000000-0000-0000-0000-0000000000c1','e1000000-0000-0000-0000-000000000001','M',false,
   public.normalize_arabic('احمد'),public.arabic_phonetic('احمد'),public.normalize_arabic('خطيب'),public.arabic_phonetic('خطيب'),
   public.normalize_arabic('محمد'),public.arabic_phonetic('محمد'),public.normalize_arabic('فاطمة'),public.arabic_phonetic('فاطمة'),
   public.normalize_arabic('سالم'),public.arabic_phonetic('سالم'),NULL,NULL,1950,'e1000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-0000000000c2','e2000000-0000-0000-0000-000000000002','M',true,
   public.normalize_arabic('احمد'),public.arabic_phonetic('احمد'),public.normalize_arabic('خطيب'),public.arabic_phonetic('خطيب'),
   public.normalize_arabic('محمد'),public.arabic_phonetic('محمد'),public.normalize_arabic('فاطمة'),public.arabic_phonetic('فاطمة'),
   public.normalize_arabic('سالم'),public.arabic_phonetic('سالم'),NULL,NULL,1950,'e1000000-0000-0000-0000-000000000001'),
  -- patriline-only: given+father+pgf, nothing else
  ('f0000000-0000-0000-0000-0000000000d1','e1000000-0000-0000-0000-000000000001','M',false,
   public.normalize_arabic('احمد'),public.arabic_phonetic('احمد'),NULL,NULL,public.normalize_arabic('محمد'),public.arabic_phonetic('محمد'),
   NULL,NULL,NULL,NULL,public.normalize_arabic('خليل'),public.arabic_phonetic('خليل'),NULL,NULL),
  ('f0000000-0000-0000-0000-0000000000d2','e2000000-0000-0000-0000-000000000002','M',false,
   public.normalize_arabic('احمد'),public.arabic_phonetic('احمد'),NULL,NULL,public.normalize_arabic('محمد'),public.arabic_phonetic('محمد'),
   NULL,NULL,NULL,NULL,public.normalize_arabic('خليل'),public.arabic_phonetic('خليل'),NULL,NULL);

-- 1. score_pct in (0, 1]
SELECT cmp_ok((SELECT (breakdown->'meta'->>'score_pct')::numeric FROM public.score_pair(
    'f0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-0000000000a2')),
  '>', 0.0, 'score_pct is positive for a duplicate');
SELECT cmp_ok((SELECT (breakdown->'meta'->>'score_pct')::numeric FROM public.score_pair(
    'f0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-0000000000a2')),
  '<=', 1.0, 'score_pct never exceeds 1.0');

-- 2. present-but-different mother → disagreement veto + review
SELECT ok((SELECT breakdown->'meta'->'vetoes' FROM public.score_pair(
    'f0000000-0000-0000-0000-0000000000b1','f0000000-0000-0000-0000-0000000000b2')) @> '["mother_disagree"]',
  'present-but-different mother is vetoed');

-- 3. with a reachable threshold, a rich cross-tree duplicate auto-links
UPDATE public.app_settings SET auto_merge_threshold = 100;
SELECT is((SELECT breakdown->'meta'->>'decision' FROM public.score_pair(
    'f0000000-0000-0000-0000-0000000000a1','f0000000-0000-0000-0000-0000000000a2')),
  'auto_link', 'rich duplicate with non-patriline corroborator auto-links (threshold 100)');

-- 4. a living person never auto-links
SELECT is((SELECT breakdown->'meta'->>'decision' FROM public.score_pair(
    'f0000000-0000-0000-0000-0000000000c1','f0000000-0000-0000-0000-0000000000c2')),
  'review', 'a living person is capped at review');

-- 5. patriline-only match (no non-patriline corroborator) stays review
SELECT is((SELECT breakdown->'meta'->>'decision' FROM public.score_pair(
    'f0000000-0000-0000-0000-0000000000d1','f0000000-0000-0000-0000-0000000000d2')),
  'review', 'patriline-only match is not enough to auto-link');

SELECT finish();
ROLLBACK;
