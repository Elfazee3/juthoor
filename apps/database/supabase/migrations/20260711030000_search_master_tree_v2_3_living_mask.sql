-- M0 §5.5 (B6b): mask a LIVING person's birth_year + origin (place id + names)
-- in search results for viewers who are not privileged (owner / approved member)
-- on that tree. Public visibility of a living person must not carry their birth
-- year + village. (v2_2 already redacts non-accessible/private trees; this adds
-- living-person life-data masking on top, including for public trees.)
--
-- Signature and returned columns are unchanged from v2_2 → CREATE OR REPLACE.
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
  person_id            uuid,
  tree_id              uuid,
  tree_name            text,
  tree_is_public       boolean,
  tree_is_accessible   boolean,
  display_name_ar      text,
  display_name_en      text,
  gender               gender_type,
  primary_given        text,
  primary_surname      text,
  birth_year           smallint,
  origin_place_id      uuid,
  origin_name_ar       text,
  origin_name_en       text,
  score                real,
  breakdown            jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
  enriched AS (
    SELECT p.id AS person_id, p.tree_id, p.gender,
           p.display_name_ar, p.display_name_en,
           pn.given_name AS primary_given, pn.surname AS primary_surname,
           pn.given_name_norm AS g_norm_row, pn.surname_norm AS s_norm_row,
           pn.given_phonetic AS g_phon_row, pn.surname_phonetic AS s_phon_row,
      (SELECT e.date_year FROM events e WHERE e.person_id=p.id AND e.event_type='BIRT' LIMIT 1) AS birth_year,
      (SELECT e.place_id  FROM events e WHERE e.person_id=p.id AND e.event_type='BIRT' LIMIT 1) AS origin_place_id,
      (SELECT public.normalize_arabic(fn.given_name) FROM family_children fc
        JOIN families fam ON fam.id=fc.family_id
        JOIN person_names fn ON fn.person_id=fam.partner1_id AND fn.is_primary
        WHERE fc.child_id=p.id LIMIT 1) AS father_given_norm,
      (SELECT public.normalize_arabic(mn.given_name) FROM family_children fc
        JOIN families fam ON fam.id=fc.family_id
        JOIN person_names mn ON mn.person_id=fam.partner2_id AND mn.is_primary
        WHERE fc.child_id=p.id LIMIT 1) AS mother_given_norm
    FROM persons p
    INNER JOIN person_names pn ON pn.person_id=p.id AND pn.is_primary=true
  ),
  scored AS (
    SELECT e.*,
      CASE WHEN (SELECT g_norm FROM params)<>'' THEN
        GREATEST(
          COALESCE(extensions.similarity(e.g_norm_row,(SELECT g_norm FROM params)),0),
          COALESCE(extensions.similarity(e.g_phon_row,(SELECT g_phon FROM params)),0)*0.85)
      ELSE 0 END AS s_given,
      CASE WHEN (SELECT s_norm FROM params)<>'' THEN
        GREATEST(
          COALESCE(extensions.similarity(e.s_norm_row,(SELECT s_norm FROM params)),0),
          COALESCE(extensions.similarity(e.s_phon_row,(SELECT s_phon FROM params)),0)*0.85)
      ELSE 0 END AS s_surname,
      CASE WHEN (SELECT f_norm FROM params)<>'' AND e.father_given_norm IS NOT NULL THEN
        COALESCE(extensions.similarity(e.father_given_norm,(SELECT f_norm FROM params)),0)
      ELSE 0 END AS s_father,
      CASE WHEN (SELECT m_norm FROM params)<>'' AND e.mother_given_norm IS NOT NULL THEN
        COALESCE(extensions.similarity(e.mother_given_norm,(SELECT m_norm FROM params)),0)
      ELSE 0 END AS s_mother,
      CASE WHEN (SELECT free_norm FROM params)<>'' THEN
        GREATEST(
          COALESCE(extensions.similarity(e.g_norm_row,(SELECT free_norm FROM params)),0),
          COALESCE(extensions.similarity(e.s_norm_row,(SELECT free_norm FROM params)),0),
          COALESCE(extensions.similarity(e.g_phon_row,(SELECT free_phon FROM params)),0)*0.85,
          COALESCE(extensions.similarity(e.s_phon_row,(SELECT free_phon FROM params)),0)*0.85)
      ELSE 0 END AS s_free,
      CASE WHEN q_place_id IS NOT NULL AND e.origin_place_id=q_place_id THEN 1.0 ELSE 0 END AS s_place,
      CASE WHEN q_birth_year IS NOT NULL AND e.birth_year IS NOT NULL THEN
        GREATEST(0, 1.0 - (ABS(e.birth_year - q_birth_year)::real / GREATEST(1, q_year_window)))
      ELSE 0 END AS s_year
    FROM enriched e
    WHERE q_gender IS NULL OR e.gender=q_gender
  ),
  final_rows AS (
    SELECT s.*,
      ( s.s_given>=0.35 OR s.s_surname>=0.35 OR s.s_free>=0.35
        OR s.s_father>=0.5 OR s.s_mother>=0.5
        OR s.s_place>=1.0 OR s.s_year>=0.5 ) AS passes_gate,
      LEAST(1.0,
        (s.s_given*0.28)+(s.s_surname*0.28)+(s.s_free*0.22)
      + (s.s_father*0.10)+(s.s_mother*0.10)
      + (s.s_place*0.15)+(s.s_year*0.10))::real AS total_score,
      jsonb_build_object(
        'given',round(s.s_given::numeric,2),
        'surname',round(s.s_surname::numeric,2),
        'free',round(s.s_free::numeric,2),
        'father',round(s.s_father::numeric,2),
        'mother',round(s.s_mother::numeric,2),
        'place',round(s.s_place::numeric,2),
        'year',round(s.s_year::numeric,2)) AS breakdown
    FROM scored s
  ),
  accessible_flag AS (
    SELECT f.*, t.name AS t_name, t.is_public,
      ( t.is_public
        OR t.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM tree_members tm
                    WHERE tm.tree_id=t.id AND tm.user_id=auth.uid() AND tm.status='approved')
      ) AS is_accessible,
      ( t.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM tree_members tm
                    WHERE tm.tree_id=t.id AND tm.user_id=auth.uid() AND tm.status='approved')
      ) AS is_privileged
    FROM final_rows f
    INNER JOIN trees t ON t.id = f.tree_id
    WHERE f.passes_gate
  )
  SELECT
    a.person_id,
    a.tree_id,
    a.t_name,
    a.is_public,
    a.is_accessible,
    CASE WHEN a.is_accessible THEN a.display_name_ar ELSE NULL END,
    CASE WHEN a.is_accessible THEN a.display_name_en ELSE NULL END,
    a.gender,
    CASE WHEN a.is_accessible THEN a.primary_given ELSE NULL END,
    CASE WHEN a.is_accessible THEN a.primary_surname ELSE NULL END,
    -- Life data: masked for a LIVING person unless the viewer is privileged.
    CASE WHEN a.is_accessible AND (a.is_privileged OR NOT public.is_person_living(a.person_id))
         THEN a.birth_year ELSE NULL END,
    CASE WHEN a.is_accessible AND (a.is_privileged OR NOT public.is_person_living(a.person_id))
         THEN a.origin_place_id ELSE NULL END,
    CASE WHEN a.is_accessible AND (a.is_privileged OR NOT public.is_person_living(a.person_id))
         THEN pl.name_ar ELSE NULL END,
    CASE WHEN a.is_accessible AND (a.is_privileged OR NOT public.is_person_living(a.person_id))
         THEN pl.name_en ELSE NULL END,
    a.total_score,
    a.breakdown
  FROM accessible_flag a
  LEFT JOIN places pl ON pl.id = a.origin_place_id
  ORDER BY a.total_score DESC, a.display_name_ar NULLS LAST
  LIMIT GREATEST(1, LEAST(100, lim));
$$;

GRANT EXECUTE ON FUNCTION public.search_master_tree(text, text, text, text, text, uuid, int, int, gender_type, int)
  TO authenticated, anon;
