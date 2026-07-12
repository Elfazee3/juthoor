
CREATE OR REPLACE FUNCTION public.search_master_tree(
  q_given   text DEFAULT NULL,
  q_surname text DEFAULT NULL,
  q_free    text DEFAULT NULL,
  lim       int  DEFAULT 25
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
  score            real
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH params AS (
    SELECT
      public.normalize_arabic(q_given)   AS g_norm,
      public.normalize_arabic(q_surname) AS s_norm,
      public.normalize_arabic(q_free)    AS f_norm
  ),
  scored AS (
    SELECT
      p.id              AS person_id,
      p.tree_id         AS tree_id,
      p.display_name_ar AS display_name_ar,
      p.display_name_en AS display_name_en,
      p.gender          AS gender,
      pn.given_name     AS primary_given,
      pn.surname        AS primary_surname,
      (
        CASE
          WHEN (SELECT g_norm FROM params) <> '' THEN
            COALESCE(extensions.similarity(pn.given_name_norm, (SELECT g_norm FROM params)), 0) * 0.50
            + CASE WHEN pn.given_name_norm LIKE (SELECT g_norm FROM params) || '%' THEN 0.25 ELSE 0 END
          ELSE 0
        END
        +
        CASE
          WHEN (SELECT s_norm FROM params) <> '' THEN
            COALESCE(extensions.similarity(pn.surname_norm, (SELECT s_norm FROM params)), 0) * 0.50
            + CASE WHEN pn.surname_norm LIKE (SELECT s_norm FROM params) || '%' THEN 0.25 ELSE 0 END
          ELSE 0
        END
        +
        CASE
          WHEN (SELECT f_norm FROM params) <> '' THEN
            GREATEST(
              COALESCE(extensions.similarity(pn.given_name_norm, (SELECT f_norm FROM params)), 0),
              COALESCE(extensions.similarity(pn.surname_norm,    (SELECT f_norm FROM params)), 0)
            )
          ELSE 0
        END
      )::real AS score
    FROM public.persons p
    INNER JOIN public.person_names pn
      ON pn.person_id = p.id AND pn.is_primary = true
    WHERE
      (
        ((SELECT g_norm FROM params) <> '' AND pn.given_name_norm   % (SELECT g_norm FROM params))
        OR ((SELECT s_norm FROM params) <> '' AND pn.surname_norm % (SELECT s_norm FROM params))
        OR ((SELECT f_norm FROM params) <> '' AND (
             pn.given_name_norm % (SELECT f_norm FROM params)
          OR pn.surname_norm    % (SELECT f_norm FROM params)
        ))
      )
  )
  SELECT
    s.person_id,
    s.tree_id,
    t.name         AS tree_name,
    t.is_public    AS tree_is_public,
    s.display_name_ar,
    s.display_name_en,
    s.gender,
    s.primary_given,
    s.primary_surname,
    s.score
  FROM scored s
  INNER JOIN public.trees t ON t.id = s.tree_id
  WHERE s.score > 0.15
  ORDER BY s.score DESC, s.display_name_ar NULLS LAST
  LIMIT GREATEST(1, LEAST(100, lim));
$$;

COMMENT ON FUNCTION public.search_master_tree IS
  'Full-text fuzzy search over public + accessible family trees. Arabic-normalized. Returns ranked results.';

GRANT EXECUTE ON FUNCTION public.search_master_tree(text, text, text, int) TO authenticated, anon;
