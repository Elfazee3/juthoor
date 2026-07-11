-- M1 cross-script fold (matching engine, plan §6, correctness BLOCKING #3):
-- transliterate_to_arabic() folds Latin-script Palestinian names to Arabic so
-- Ibrahim / Ibraheem / Abraham / ابراهيم all normalize to the same key. Ported
-- from the app's FALLBACK_LATIN_TO_ARABIC table (lib/search/phonetic.ts). This
-- is the deterministic v1 (jslingua/buckwalter is a documented v2); the
-- name_variants dictionary is seeded as a supplement, not the normalizer.

CREATE OR REPLACE FUNCTION public.transliterate_to_arabic(txt text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
DECLARE
  v text := coalesce(txt, '');
BEGIN
  IF v = '' THEN RETURN v; END IF;
  -- Already Arabic script → leave it for normalize_arabic/arabic_phonetic.
  IF v ~ '[ء-ي]' THEN RETURN v; END IF;

  -- Fallback table (each replace is a no-op if its pattern is absent).
  v := regexp_replace(v, 'ibraheem|ibrahim|ebrahim|abraham', 'ابراهيم', 'gi');
  v := regexp_replace(v, 'ahmad|ahmed|achmed',               'احمد',    'gi');
  v := regexp_replace(v, 'mohammad|mohammed|muhammad|muhammed', 'محمد', 'gi');
  v := regexp_replace(v, 'yousef|youssef|yusuf|yusef|joseph', 'يوسف',   'gi');
  v := regexp_replace(v, 'omar|umar',                        'عمر',     'gi');
  v := regexp_replace(v, 'hassan|hasan',                     'حسن',     'gi');
  v := regexp_replace(v, 'khaled|khalid',                    'خالد',    'gi');
  v := regexp_replace(v, 'fatima|fatma|fatema',              'فاطمة',   'gi');
  v := regexp_replace(v, 'aisha|ayesha',                     'عائشة',   'gi');
  v := regexp_replace(v, 'samaa|sama',                       'سماء',    'gi');
  v := regexp_replace(v, 'al-ajrami|alajrami|ajrami',        'العجرمي', 'gi');
  v := regexp_replace(v, 'al-hajj|alhajj|hajj',              'الحاج',   'gi');
  v := regexp_replace(v, 'al-masri|almasri|masri',           'المصري',  'gi');
  v := regexp_replace(v, 'khalil',                           'خليل',    'gi');
  v := regexp_replace(v, 'ali',                              'علي',     'gi');

  -- Did any rule fire? (Arabic now present.) If so, drop leftover Latin and
  -- collapse whitespace; otherwise return the input untouched.
  IF v ~ '[ء-ي]' THEN
    v := btrim(regexp_replace(regexp_replace(v, '[a-z-]', ' ', 'gi'), '\s+', ' ', 'g'));
    RETURN v;
  END IF;
  RETURN txt;
END $$;

COMMENT ON FUNCTION public.transliterate_to_arabic IS
  'Latin->Arabic fold for well-known Palestinian names (deterministic v1, ported from the app fallback table). Runs before normalize_arabic/arabic_phonetic in the feature layer.';

REVOKE ALL ON FUNCTION public.transliterate_to_arabic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transliterate_to_arabic(text) TO authenticated, anon;

-- ── name_variants — Arabic equivalence dictionary (data, not code) ──────────
CREATE TABLE IF NOT EXISTS public.name_variants (
  id        uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  canonical text NOT NULL,                    -- Arabic canonical form
  variant   text NOT NULL,                    -- an alternate spelling (Latin or Arabic)
  kind      text NOT NULL DEFAULT 'latin',    -- 'latin' | 'arabic'
  UNIQUE (canonical, variant)
);

ALTER TABLE public.name_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS name_variants_read ON public.name_variants;
CREATE POLICY name_variants_read ON public.name_variants
  FOR SELECT TO authenticated, anon USING (true);

COMMENT ON TABLE public.name_variants IS
  'Name equivalence dictionary (reference data). Seeded from the Latin->Arabic fallback set; a supplement to transliterate_to_arabic, not the normalizer.';

INSERT INTO public.name_variants (canonical, variant, kind) VALUES
  ('ابراهيم', 'ibrahim',  'latin'), ('ابراهيم', 'ibraheem', 'latin'),
  ('ابراهيم', 'ebrahim',  'latin'), ('ابراهيم', 'abraham',  'latin'),
  ('احمد',    'ahmad',    'latin'), ('احمد',    'ahmed',    'latin'),
  ('محمد',    'mohammad', 'latin'), ('محمد',    'muhammad', 'latin'),
  ('يوسف',    'yousef',   'latin'), ('يوسف',    'youssef',  'latin'),
  ('يوسف',    'yusuf',    'latin'), ('يوسف',    'joseph',   'latin'),
  ('عمر',     'omar',     'latin'), ('عمر',     'umar',     'latin'),
  ('حسن',     'hassan',   'latin'), ('حسن',     'hasan',    'latin'),
  ('خالد',    'khaled',   'latin'), ('خالد',    'khalid',   'latin'),
  ('فاطمة',   'fatima',   'latin'), ('فاطمة',   'fatma',    'latin'),
  ('عائشة',   'aisha',    'latin'), ('عائشة',   'ayesha',   'latin'),
  ('العجرمي', 'ajrami',   'latin'), ('الحاج',   'hajj',     'latin'),
  ('المصري',  'masri',    'latin'), ('خليل',    'khalil',   'latin'),
  ('علي',     'ali',      'latin')
ON CONFLICT (canonical, variant) DO NOTHING;
