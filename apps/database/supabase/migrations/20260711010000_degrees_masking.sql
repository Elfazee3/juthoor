-- M0 security fix (matching engine, plan §5.1): degrees-path masking.
--
-- compute_degrees() emitted name_ar/name_en/gender for EVERY node on the path,
-- and cached that named path in match_paths. A living person in a PUBLIC tree
-- (readable by every authenticated user) was therefore broadcast by name across
-- family boundaries via the degrees chain — a deanonymization channel. It also
-- stored per-node PII in the shared cache.
--
-- Fix:
--   1. is_person_living() — no DEAT and birth < 100y ago; fails toward LIVING
--      when the birth year is unknown (privacy-safe default).
--   2. mask_degrees_path() — renders a structural path into a per-viewer path:
--      a node's name/gender is revealed only if it is the caller's own source
--      node, OR the caller can_access_tree() of it AND the person is not living.
--      Everything else is a redacted token ("فردٌ على المسار / Hidden relative").
--   3. compute_degrees() now caches only the STRUCTURAL path (person_id +
--      relation, no names) and applies mask_degrees_path() per-viewer on both the
--      fresh and cached return paths.

-- ── 1. is_person_living ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_person_living(p_person_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    -- A recorded death → not living.
    WHEN EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.person_id = p_person_id AND e.event_type = 'DEAT'
    ) THEN false
    -- Birth year known and ≥ 100 years ago → presumed not living.
    WHEN EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.person_id = p_person_id AND e.event_type = 'BIRT'
        AND e.date_year IS NOT NULL
        AND e.date_year <= (extract(year FROM now())::int - 100)
    ) THEN false
    -- No death, and birth < 100y or unknown → fail toward living.
    ELSE true
  END;
$$;

COMMENT ON FUNCTION public.is_person_living IS
  'True when a person has no death event and birth implies < 100y; fails toward living when birth is unknown (privacy-safe).';

REVOKE ALL ON FUNCTION public.is_person_living(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_person_living(uuid) TO authenticated;

-- ── 2. mask_degrees_path ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mask_degrees_path(p_source uuid, p_struct jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'person_id', elem->>'person_id',
      'relation',  elem->>'relation',
      'name_ar', CASE WHEN reveal THEN p.display_name_ar ELSE 'فردٌ على المسار' END,
      'name_en', CASE WHEN reveal THEN p.display_name_en ELSE 'Hidden relative' END,
      'gender',  CASE WHEN reveal THEN p.gender::text ELSE NULL END,
      'masked',  NOT reveal
    ) ORDER BY ord
  ), '[]'::jsonb)
  FROM jsonb_array_elements(p_struct) WITH ORDINALITY AS e(elem, ord)
  LEFT JOIN public.persons p ON p.id = NULLIF(elem->>'person_id', '')::uuid
  , LATERAL (
      SELECT (
        NULLIF(elem->>'person_id', '')::uuid = p_source
        OR (p.tree_id IS NOT NULL
            AND public.can_access_tree(p.tree_id)
            AND NOT public.is_person_living(p.id))
      ) AS reveal
    ) r;
$$;

COMMENT ON FUNCTION public.mask_degrees_path IS
  'Renders a structural degrees path into a per-viewer masked path: names/gender revealed only for the caller''s own node or accessible, non-living persons.';

REVOKE ALL ON FUNCTION public.mask_degrees_path(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mask_degrees_path(uuid, jsonb) TO authenticated;

-- ── 3. compute_degrees: cache structural, mask on return ─────────────────────
CREATE OR REPLACE FUNCTION public.compute_degrees(p_source uuid, p_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lo uuid;
  v_hi uuid;
  v_cached public.match_paths%ROWTYPE;
  v_degrees int;
  v_struct jsonb;
BEGIN
  IF p_source IS NULL OR p_target IS NULL OR p_source = p_target THEN
    RETURN jsonb_build_object('degrees', 0, 'path', jsonb_build_array());
  END IF;

  v_lo := LEAST(p_source, p_target);
  v_hi := GREATEST(p_source, p_target);

  -- Cache holds the STRUCTURAL path only; masking is applied per-viewer below.
  SELECT * INTO v_cached FROM public.match_paths
    WHERE source_person_id = v_lo AND target_person_id = v_hi
      AND computed_at > now() - interval '24 hours'
    LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'degrees', v_cached.degrees,
      'path', public.mask_degrees_path(p_source, v_cached.path_json),
      'cached', true
    );
  END IF;

  WITH RECURSIVE edges AS (
    SELECT fam.partner1_id AS a, fc.child_id AS b, 'parent'::text AS rel
      FROM family_children fc JOIN families fam ON fam.id = fc.family_id
      WHERE fam.partner1_id IS NOT NULL
    UNION ALL
    SELECT fam.partner2_id, fc.child_id, 'parent'
      FROM family_children fc JOIN families fam ON fam.id = fc.family_id
      WHERE fam.partner2_id IS NOT NULL
    UNION ALL
    SELECT fc.child_id, fam.partner1_id, 'child'
      FROM family_children fc JOIN families fam ON fam.id = fc.family_id
      WHERE fam.partner1_id IS NOT NULL
    UNION ALL
    SELECT fc.child_id, fam.partner2_id, 'child'
      FROM family_children fc JOIN families fam ON fam.id = fc.family_id
      WHERE fam.partner2_id IS NOT NULL
    UNION ALL
    SELECT partner1_id, partner2_id, 'spouse' FROM families WHERE partner1_id IS NOT NULL AND partner2_id IS NOT NULL
    UNION ALL
    SELECT partner2_id, partner1_id, 'spouse' FROM families WHERE partner1_id IS NOT NULL AND partner2_id IS NOT NULL
    UNION ALL
    SELECT fc1.child_id, fc2.child_id, 'sibling'
      FROM family_children fc1 JOIN family_children fc2 ON fc1.family_id = fc2.family_id
      WHERE fc1.child_id <> fc2.child_id
  ),
  bfs AS (
    SELECT p_source AS node, 0 AS depth, ARRAY[p_source] AS path, ARRAY[]::text[] AS rels
    UNION ALL
    SELECT e.b, bfs.depth + 1, bfs.path || e.b, bfs.rels || e.rel
      FROM bfs JOIN edges e ON e.a = bfs.node
      WHERE bfs.depth < 8 AND NOT (e.b = ANY(bfs.path))
  ),
  hit AS (
    SELECT * FROM bfs WHERE node = p_target ORDER BY depth ASC LIMIT 1
  )
  SELECT
    h.depth,
    (SELECT jsonb_agg(
        jsonb_build_object(
          'person_id', pid,
          'relation', CASE WHEN idx = 1 THEN 'self' ELSE h.rels[idx - 1] END
        ) ORDER BY idx)
      FROM unnest(h.path) WITH ORDINALITY AS t(pid, idx))
  INTO v_degrees, v_struct
  FROM hit h;

  IF v_struct IS NULL THEN
    RETURN NULL;
  END IF;

  -- Cache the STRUCTURAL path (no names → PII-minimized at rest).
  BEGIN
    INSERT INTO public.match_paths(source_person_id, target_person_id, degrees, path_json)
      VALUES (v_lo, v_hi, v_degrees::smallint, v_struct)
    ON CONFLICT (source_person_id, target_person_id) DO UPDATE
      SET degrees = EXCLUDED.degrees, path_json = EXCLUDED.path_json, computed_at = now();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'degrees', v_degrees,
    'path', public.mask_degrees_path(p_source, v_struct)
  );
END $$;

GRANT EXECUTE ON FUNCTION public.compute_degrees(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.compute_degrees IS
  'BFS over parent/child/spouse/sibling edges. Max depth 8. Caches the structural path in match_paths (24h); names/gender are masked per-viewer on return (plan §5.1).';

-- Drop any pre-masking cached paths (they hold per-node names in the old format).
DELETE FROM public.match_paths;
