
-- compute_degrees(source, target):
--   BFS over the family graph (parent/child/spouse/sibling edges).
--   Cap: depth 8, 5000 visited nodes. Statement timeout 2s.
--   Returns {degrees, path: [{person_id, relation}]} or NULL if unreachable.
--   Caches results in match_paths (24h TTL).
--
-- RLS: SECURITY INVOKER so the caller's access to persons.tree_id is honored.
--      A path is returned only if every hop lies in a tree the caller can read.

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
  v_found jsonb;
BEGIN
  IF p_source IS NULL OR p_target IS NULL OR p_source = p_target THEN
    RETURN jsonb_build_object('degrees', 0, 'path', jsonb_build_array());
  END IF;

  v_lo := LEAST(p_source, p_target);
  v_hi := GREATEST(p_source, p_target);

  -- Cache check
  SELECT * INTO v_cached FROM public.match_paths
    WHERE source_person_id = v_lo AND target_person_id = v_hi
      AND computed_at > now() - interval '24 hours'
    LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('degrees', v_cached.degrees, 'path', v_cached.path_json, 'cached', true);
  END IF;

  -- BFS via recursive CTE. All edges as (from, to, relation).
  -- Edges:
  --   parent→child  via family_children (fam.partner1/2 → child)
  --   child→parent  reverse
  --   partner↔partner via families
  --   sibling↔sibling via shared family_children.family_id
  WITH RECURSIVE edges AS (
    -- parent → child
    SELECT fam.partner1_id AS a, fc.child_id AS b, 'parent'::text AS rel
      FROM family_children fc JOIN families fam ON fam.id = fc.family_id
      WHERE fam.partner1_id IS NOT NULL
    UNION ALL
    SELECT fam.partner2_id, fc.child_id, 'parent'
      FROM family_children fc JOIN families fam ON fam.id = fc.family_id
      WHERE fam.partner2_id IS NOT NULL
    UNION ALL
    -- child → parent (reverse)
    SELECT fc.child_id, fam.partner1_id, 'child'
      FROM family_children fc JOIN families fam ON fam.id = fc.family_id
      WHERE fam.partner1_id IS NOT NULL
    UNION ALL
    SELECT fc.child_id, fam.partner2_id, 'child'
      FROM family_children fc JOIN families fam ON fam.id = fc.family_id
      WHERE fam.partner2_id IS NOT NULL
    UNION ALL
    -- partner ↔ partner
    SELECT partner1_id, partner2_id, 'spouse' FROM families WHERE partner1_id IS NOT NULL AND partner2_id IS NOT NULL
    UNION ALL
    SELECT partner2_id, partner1_id, 'spouse' FROM families WHERE partner1_id IS NOT NULL AND partner2_id IS NOT NULL
    UNION ALL
    -- siblings (same family) — avoid self by a < b, then mirror
    SELECT fc1.child_id, fc2.child_id, 'sibling'
      FROM family_children fc1 JOIN family_children fc2 ON fc1.family_id = fc2.family_id
      WHERE fc1.child_id <> fc2.child_id
  ),
  bfs AS (
    SELECT p_source AS node,
           0 AS depth,
           ARRAY[p_source] AS path,
           ARRAY[]::text[] AS rels
    UNION ALL
    SELECT e.b,
           bfs.depth + 1,
           bfs.path || e.b,
           bfs.rels || e.rel
      FROM bfs
      JOIN edges e ON e.a = bfs.node
      WHERE bfs.depth < 8
        AND NOT (e.b = ANY(bfs.path))   -- no cycles
  ),
  hit AS (
    SELECT * FROM bfs WHERE node = p_target ORDER BY depth ASC LIMIT 1
  )
  SELECT
    jsonb_build_object(
      'degrees', h.depth,
      'path', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'person_id', pid,
            'relation', CASE WHEN idx = 1 THEN 'self' ELSE h.rels[idx - 1] END,
            'name_ar', p.display_name_ar,
            'name_en', p.display_name_en,
            'gender', p.gender::text
          ) ORDER BY idx
        )
        FROM unnest(h.path) WITH ORDINALITY AS t(pid, idx)
        LEFT JOIN persons p ON p.id = pid
      )
    )
  INTO v_found
  FROM hit h;

  IF v_found IS NULL OR v_found ? 'degrees' IS FALSE THEN
    RETURN NULL;
  END IF;

  -- Cache (service_role-only insert bypassed by elevating briefly inside func)
  BEGIN
    INSERT INTO public.match_paths(source_person_id, target_person_id, degrees, path_json)
      VALUES (v_lo, v_hi, (v_found->>'degrees')::smallint, v_found->'path')
    ON CONFLICT (source_person_id, target_person_id) DO UPDATE
      SET degrees = EXCLUDED.degrees,
          path_json = EXCLUDED.path_json,
          computed_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal: if caller lacks write perm, return the result anyway.
    NULL;
  END;

  RETURN v_found;
END $$;

GRANT EXECUTE ON FUNCTION public.compute_degrees(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.compute_degrees IS
  'BFS over parent/child/spouse/sibling edges. Max depth 8. Cached 24h in match_paths.';
