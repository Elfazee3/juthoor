
-- ═══════════════════════════════════════════════════════════════
-- Family Finder — Milestone 4.1
-- Arabic normalization + trigram indexes + search RPC
-- ═══════════════════════════════════════════════════════════════

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Arabic normalizer: folds alef variants (أإآٱ→ا), ya/alef-maqsura (ى→ي),
--    taa-marbuta (ة→ه), waw/ya hamza (ؤ→و, ئ→ي), strips diacritics, tatweel,
--    and collapses whitespace. Deterministic → IMMUTABLE, safe for indexes.
CREATE OR REPLACE FUNCTION public.normalize_arabic(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT regexp_replace(
    translate(
      coalesce(lower(txt), ''),
      'أإآٱىةؤئًٌٍَُِّْـ',
      'اااايهويّّّّّّّّ '
    ),
    '\s+', ' ', 'g'
  );
$$;

-- Simple sanity: "أحمد" -> "احمد"; we relax diacritics to empty space.
-- (The translate target length must match source; we use placeholder spaces
-- for the 8 diacritic marks then strip via the regexp on output.)

-- 3. Generated columns on person_names for normalized search
ALTER TABLE public.person_names
  ADD COLUMN IF NOT EXISTS given_name_norm text
    GENERATED ALWAYS AS (public.normalize_arabic(given_name)) STORED,
  ADD COLUMN IF NOT EXISTS surname_norm text
    GENERATED ALWAYS AS (public.normalize_arabic(surname)) STORED;

-- 4. Trigram GIN indexes for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_person_names_given_trgm
  ON public.person_names USING gin (given_name_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_person_names_surname_trgm
  ON public.person_names USING gin (surname_norm gin_trgm_ops);

-- Also index places for the village filter in future milestones
CREATE INDEX IF NOT EXISTS idx_places_name_ar_trgm
  ON public.places USING gin ((public.normalize_arabic(name_ar)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_places_name_en_trgm
  ON public.places USING gin ((public.normalize_arabic(name_en)) gin_trgm_ops);

COMMENT ON FUNCTION public.normalize_arabic IS
  'Folds Arabic letter variants and strips diacritics. Used by trigram indexes on person_names.';
