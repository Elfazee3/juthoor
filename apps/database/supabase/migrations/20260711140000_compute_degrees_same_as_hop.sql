-- M3 (B19): the same_as zero-cost hop in compute_degrees (plan §5.1 / §7-M3 exit).
--
-- A CONFIRMED person_link means "these two rows are the same human". The degrees
-- walk should therefore cross that link at ZERO cost and continue into the linked
-- person's relatives — that is the whole point of the Mother Tree. Because the
-- structural graph is otherwise disconnected across trees (families/children are
-- per-tree), the only cross-tree edges are these same_as links.
--
-- To reveal the *degree number* across a boundary while hiding the *named chain*
-- (§5.1 bullet 2), compute_degrees becomes SECURITY DEFINER so it can traverse the
-- structural graph of a tree the caller cannot read, and leans entirely on
-- mask_degrees_path to redact names/gender per-viewer (a boundary node in an
-- inaccessible tree renders as "فردٌ على المسار / Hidden relative"). A source-access
-- guard keeps a caller from probing degrees inside a tree they cannot see: the walk
-- only extends OUTWARD from a source they own / can access.
--
-- Also VOLATILE now (it writes the match_paths structural cache) — the B3 version
-- was STABLE, so its cache INSERT always raised "not allowed in a non-volatile
-- function" and was silently swallowed by the EXCEPTION block (caching never
-- worked). VOLATILE fixes that, which also makes revoke's cache-clear meaningful.

CREATE OR REPLACE FUNCTION public.compute_degrees(p_source uuid, p_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lo uuid;
  v_hi uuid;
  v_cached public.match_paths%ROWTYPE;
  v_degrees int;
  v_struct jsonb;
  v_src_tree uuid;
BEGIN
  IF p_source IS NULL OR p_target IS NULL OR p_source = p_target THEN
    RETURN jsonb_build_object('degrees', 0, 'path', jsonb_build_array());
  END IF;

  -- Source-access guard: the caller must be able to access the SOURCE's tree (they
  -- own it, collaborate on it, or it is public). This keeps the DEFINER traversal
  -- from letting anyone compute degrees inside a tree they cannot see; the same_as
  -- hop only extends outward from an accessible source, and interior names stay
  -- masked. (Degrees are always computed from the viewer's own accessible person.)
  SELECT tree_id INTO v_src_tree FROM public.persons WHERE id = p_source;
  IF v_src_tree IS NULL OR NOT public.can_access_tree(v_src_tree) THEN
    RETURN NULL;
  END IF;

  v_lo := LEAST(p_source, p_target);
  v_hi := GREATEST(p_source, p_target);

  -- Cache holds the STRUCTURAL path only (no names); masking is per-viewer below.
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
      FROM public.family_children fc JOIN public.families fam ON fam.id = fc.family_id
      WHERE fam.partner1_id IS NOT NULL
    UNION ALL
    SELECT fam.partner2_id, fc.child_id, 'parent'
      FROM public.family_children fc JOIN public.families fam ON fam.id = fc.family_id
      WHERE fam.partner2_id IS NOT NULL
    UNION ALL
    SELECT fc.child_id, fam.partner1_id, 'child'
      FROM public.family_children fc JOIN public.families fam ON fam.id = fc.family_id
      WHERE fam.partner1_id IS NOT NULL
    UNION ALL
    SELECT fc.child_id, fam.partner2_id, 'child'
      FROM public.family_children fc JOIN public.families fam ON fam.id = fc.family_id
      WHERE fam.partner2_id IS NOT NULL
    UNION ALL
    SELECT partner1_id, partner2_id, 'spouse' FROM public.families WHERE partner1_id IS NOT NULL AND partner2_id IS NOT NULL
    UNION ALL
    SELECT partner2_id, partner1_id, 'spouse' FROM public.families WHERE partner1_id IS NOT NULL AND partner2_id IS NOT NULL
    UNION ALL
    SELECT fc1.child_id, fc2.child_id, 'sibling'
      FROM public.family_children fc1 JOIN public.family_children fc2 ON fc1.family_id = fc2.family_id
      WHERE fc1.child_id <> fc2.child_id
    UNION ALL
    -- same_as zero-cost hops — CONFIRMED links only, both directions.
    SELECT person_a_id, person_b_id, 'same_as' FROM public.person_links WHERE status = 'confirmed'
    UNION ALL
    SELECT person_b_id, person_a_id, 'same_as' FROM public.person_links WHERE status = 'confirmed'
  ),
  bfs AS (
    SELECT p_source AS node, 0 AS depth, ARRAY[p_source] AS path, ARRAY[]::text[] AS rels
    UNION ALL
    SELECT e.b,
           bfs.depth + CASE WHEN e.rel = 'same_as' THEN 0 ELSE 1 END,  -- same_as is free
           bfs.path || e.b,
           bfs.rels || e.rel
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

  -- Cache the STRUCTURAL path (no names; same_as markers included).
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
  'BFS over parent/child/spouse/sibling edges PLUS zero-cost same_as hops across CONFIRMED person_links (plan §5.1). SECURITY DEFINER so a degree number can cross a tree boundary while mask_degrees_path redacts interior names per-viewer; a source-access guard blocks probing inside inaccessible trees. Caches the structural path (24h).';

-- Any pre-hop cached rows never carried same_as markers — clear them so paths
-- recompute with the hop.
DELETE FROM public.match_paths;
