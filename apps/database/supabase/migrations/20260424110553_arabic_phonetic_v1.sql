
-- Arabic soundex-style phonetic folder: collapses phonemic groups
-- so emphatic/non-emphatic pairs and similar-sounding letters rhyme.
--
-- Folds:
--   ص ض ظ ط  → س د ز ت  (emphatics)
--   ث ذ       → س ز      (interdentals)
--   ح خ       → ه ك      (velar fricatives)
--   غ ق       → ج ك      (uvular/back)
--   ة         → ه        (ta-marbuta)
--   ى         → ي        (alef-maqsura)
--   أ إ آ ٱ    → ا        (alef variants)
-- After folding, we collapse consecutive duplicates so "محممد" == "محمد".
CREATE OR REPLACE FUNCTION public.arabic_phonetic(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  SELECT regexp_replace(
    translate(
      public.normalize_arabic(txt),
      'صضظطثذحخغقة',
      'سدزتسزهكجكه'
    ),
    '(.)\1+',     -- collapse runs of the same letter
    '\1',
    'g'
  );
$$;

COMMENT ON FUNCTION public.arabic_phonetic IS
  'Arabic soundex-style phonemic folder. Pairs with normalize_arabic. Index target for phonetic search.';

-- Add generated columns on person_names for phonetic matching
ALTER TABLE public.person_names
  ADD COLUMN IF NOT EXISTS given_phonetic text
    GENERATED ALWAYS AS (public.arabic_phonetic(given_name)) STORED,
  ADD COLUMN IF NOT EXISTS surname_phonetic text
    GENERATED ALWAYS AS (public.arabic_phonetic(surname)) STORED;

CREATE INDEX IF NOT EXISTS idx_person_names_given_phonetic
  ON public.person_names USING gin (given_phonetic gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_person_names_surname_phonetic
  ON public.person_names USING gin (surname_phonetic gin_trgm_ops);
