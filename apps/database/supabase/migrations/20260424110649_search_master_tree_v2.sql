
-- v2: drops v1, adds 8-parameter weighted scoring with phonetic, year-range, gender,
-- village-of-origin filters, plus a JSONB score_breakdown for UI hover cards.
DROP FUNCTION IF EXISTS public.search_master_tree(text, text, text, int);

CREATE OR REPLACE FUNCTION public.search_master_tree(
  q_given        text     DEFAULT NULL,
  q_surname      text     DEFAULT NULL,
  q_father       text     DEFAULT NULL,
  q_mother       text     DEFAULT NULL,
  q_free         text     DEFAULT NULL,
  q_place_id     uuid     DEFAULT NULL,
  q_birth_year   int      DEFAULT NULL,
  q_year_window  int      DEFAULT 5,
  q_gender       gender_type DEFAULT NULL,
  lim            int      DEFAULT 25
)
RETURNS TABLE (
  person_id        uuid,
  tree_id          uuid,
  tree_name        text,
  tree_is_public   boolean,
  display_name_ar  text,
  display_name_en  text,
  gender           gender_type,
  primary_given    text,
  primary_surname  text,
  birth_year       smallint,
  origin_place_id  uuid,
  origin_name_ar   text,
  origin_name_en   text,
  score            real,
  breakdown        jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
  WITH params AS (
    SELECT
      public.normalize_arabic(q_given)    AS g_norm,
      public.normalize_arabic(q_surname)  AS s_norm,
      public.normalize_arabic(q_father)   AS f_norm,
      public.normalize_arabic(q_mother)   AS m_norm,
      public.normalize_arabic(q_free)     AS free_norm,
      public.arabic_phonetic(q_given)     AS g_phon,
      public.arabic_phonetic(q_surname)   AS s_phon,
      public.arabic_phonetic(q_free)      AS free_phon
  ),
  -- Precompute each person's parents and origin place by joining through families + events
  enriched AS (
    SELECT
      p.id                                    AS person_id,
      p.tree_id                               AS tree_id,
      p.gender                                AS gender,
      p.display_name_ar                       AS display_name_ar,
      p.display_name_en                       AS display_name_en,
      pn.given_name                           AS primary_given,
      pn.surname                              AS primary_surname,
      pn.given_name_norm                      AS g_norm_row,
      pn.surname_norm                         AS s_norm_row,
      pn.given_phonetic                       AS g_phon_row,
      pn.surname_phonetic                     AS s_phon_row,
      -- Birth event (first BIRT)
      (SELECT e.date_year FROM events e WHERE e.person_id = p.id AND e.event_type = 'BIRT' LIMIT 1) AS birth_year,
      (SELECT e.place_id  FROM events e WHERE e.person_id = p.id AND e.event_type = 'BIRT' LIMIT 1) AS origin_place_id,
      -- Parents: look up the family where p is a child, take partner1 (typically father) and partner2 (mother)
      (SELECT fn.given_name FROM family_children fc
        JOIN families fam ON fam.id = fc.family_id
        JOIN person_names fn ON fn.person_id = fam.partner1_id AND fn.is_primary
        WHERE fc.child_id = p.id LIMIT 1)    AS father_given_name,
      (SELECT public.normalize_arabic(fn.given_name) FROM family_children fc
        JOIN families fam ON fam.id = fc.family_id
        JOIN person_names fn ON fn.person_id = fam.partner1_id AND fn.is_primary
        WHERE fc.child_id = p.id LIMIT 1)    AS father_given_norm,
      (SELECT mn.given_name FROM family_children fc
        JOIN families fam ON fam.id = fc.family_id
        JOIN person_names mn ON mn.person_id = fam.partner2_id AND mn.is_primary
        WHERE fc.child_id = p.id LIMIT 1)    AS mother_given_name,
      (SELECT public.normalize_arabic(mn.given_name) FROM family_children fc
        JOIN families fam ON fam.id = fc.family_id
        JOIN person_names mn ON mn.person_id = fam.partner2_id AND mn.is_primary
        WHERE fc.child_id = p.id LIMIT 1)    AS mother_given_norm
    FROM persons p
    INNER JOIN person_names pn ON pn.person_id = p.id AND pn.is_primary = true
  ),
  scored AS (
    SELECT
      e.*,
      -- Per-field scores (0-1 each; weights applied via final sum cap)
      CASE WHEN (SELECT g_norm FROM params) <> '' THEN
        GREATEST(
          COALESCE(extensions.similarity(e.g_norm_row, (SELECT g_norm FROM params)), 0),
          COALESCE(extensions.similarity(e.g_phon_row, (SELECT g_phon FROM params)), 0) * 0.85
        )
      ELSE 0 END                                AS s_given,

      CASE WHEN (SELECT s_norm FROM params) <> '' THEN
        GREATEST(
          COALESCE(extensions.similarity(e.s_norm_row, (SELECT s_norm FROM params)), 0),
          COALESCE(extensions.similarity(e.s_phon_row, (SELECT s_phon FROM params)), 0) * 0.85
        )
      ELSE 0 END                                AS s_surname,

      CASE WHEN (SELECT f_norm FROM params) <> '' AND e.father_given_norm IS NOT NULL THEN
        COALESCE(extensions.similarity(e.father_given_norm, (SELECT f_norm FROM params)), 0)
      ELSE 0 END                                AS s_father,

      CASE WHEN (SELECT m_norm FROM params) <> '' AND e.mother_given_norm IS NOT NULL THEN
        COALESCE(extensions.similarity(e.mother_given_norm, (SELECT m_norm FROM params)), 0)
      ELSE 0 END                                AS s_mother,

      CASE WHEN (SELECT free_norm FROM params) <> '' THEN
        GREATEST(
          COALESCE(extensions.similarity(e.g_norm_row, (SELECT free_norm FROM params)), 0),
          COALESCE(extensions.similarity(e.s_norm_row, (SELECT free_norm FROM params)), 0),
          COALESCE(extensions.similarity(e.g_phon_row, (SELECT free_phon FROM params)), 0) * 0.85,
          COALESCE(extensions.similarity(e.s_phon_row, (SELECT free_phon FROM params)), 0) * 0.85
        )
      ELSE 0 END                                AS s_free,

      CASE WHEN q_place_id IS NOT NULL AND e.origin_place_id = q_place_id THEN 1.0 ELSE 0 END AS s_place,

      CASE WHEN q_birth_year IS NOT NULL AND e.birth_year IS NOT NULL THEN
        GREATEST(0, 1.0 - (ABS(e.birth_year - q_birth_year)::real / GREATEST(1, q_year_window)))
      ELSE 0 END                                AS s_year
    FROM enriched e
    WHERE
      -- Gender filter (exclude)
      (q_gender IS NULL OR e.gender = q_gender)
      -- At least one name/phonetic clause touches the row to avoid full-table scan
      AND (
        ((SELECT g_norm FROM params) <> '' AND
           (e.g_norm_row % (SELECT g_norm FROM params) OR e.g_phon_row % (SELECT g_phon FROM params)))
        OR ((SELECT s_norm FROM params) <> '' AND
           (e.s_norm_row % (SELECT s_norm FROM params) OR e.s_phon_row % (SELECT s_phon FROM params)))
        OR ((SELECT f_norm FROM params) <> '' AND e.father_given_norm % (SELECT f_norm FROM params))
        OR ((SELECT m_norm FROM params) <> '' AND e.mother_given_norm % (SELECT m_norm FROM params))
        OR ((SELECT free_norm FROM params) <> '' AND
           (e.g_norm_row % (SELECT free_norm FROM params) OR e.s_norm_row % (SELECT free_norm FROM params)))
        OR q_place_id IS NOT NULL
        OR q_birth_year IS NOT NULL
      )
  ),
  final_rows AS (
    SELECT
      s.*,
      -- Weighted combined score: given+surname+free weight the most, others additive
      LEAST(1.0,
        (s.s_given * 0.28) + (s.s_surname * 0.28) + (s.s_free * 0.22)
      + (s.s_father * 0.10) + (s.s_mother * 0.10)
      + (s.s_place * 0.15) + (s.s_year * 0.10)
      )::real AS total_score,
      jsonb_build_object(
        'given',   round(s.s_given::numeric, 2),
        'surname', round(s.s_surname::numeric, 2),
        'free',    round(s.s_free::numeric, 2),
        'father',  round(s.s_father::numeric, 2),
        'mother',  round(s.s_mother::numeric, 2),
        'place',   round(s.s_place::numeric, 2),
        'year',    round(s.s_year::numeric, 2)
      ) AS breakdown
    FROM scored s
  )
  SELECT
    f.person_id, f.tree_id, t.name, t.is_public,
    f.display_name_ar, f.display_name_en, f.gender,
    f.primary_given, f.primary_surname,
    f.birth_year, f.origin_place_id,
    pl.name_ar, pl.name_en,
    f.total_score, f.breakdown
  FROM final_rows f
  INNER JOIN trees t ON t.id = f.tree_id
  LEFT JOIN places pl ON pl.id = f.origin_place_id
  WHERE f.total_score > 0.12
  ORDER BY f.total_score DESC, f.display_name_ar NULLS LAST
  LIMIT GREATEST(1, LEAST(100, lim));
$$;

GRANT EXECUTE ON FUNCTION public.search_master_tree(text, text, text, text, text, uuid, int, int, gender_type, int)
  TO authenticated, anon;
