-- M1 (B9): score_pair — the single authoritative FRS scorer (plan §4).
-- This is the SCORING CORE: 25 weighted parameters, literal+phonetic collapse,
-- partial credit, missing=0, hard safety vetoes, and a PII-minimized breakdown.
-- The refined auto-link gate (evidence-cluster gating, disagreement vetoes,
-- score_pct over clusters) is layered on in B9b. Shadow mode routes everything
-- to review regardless, so this core is safe to run now.

-- ── scoring helpers ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mf_name_pts(a text, b text, w int) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path = public, extensions, pg_temp AS $$
  SELECT CASE
    WHEN a IS NULL OR b IS NULL OR a = '' OR b = '' THEN 0
    WHEN a = b THEN w
    WHEN extensions.similarity(a, b) >= 0.45 THEN round(w * extensions.similarity(a, b))::int
    ELSE 0
  END;
$$;

-- literal+phonetic collapse: max(literal, phonetic) + 2 when the literal is exact.
CREATE OR REPLACE FUNCTION public.mf_collapse_pts(
  a_norm text, b_norm text, a_phon text, b_phon text, w int
) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path = public, extensions, pg_temp AS $$
  SELECT GREATEST(
           public.mf_name_pts(a_norm, b_norm, w),
           CASE WHEN a_phon IS NOT NULL AND a_phon <> '' AND a_phon = b_phon THEN w ELSE 0 END
         )
       + CASE WHEN a_norm IS NOT NULL AND a_norm <> '' AND a_norm = b_norm THEN 2 ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.mf_year_pts(a smallint, b smallint, w int) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE
    WHEN a IS NULL OR b IS NULL THEN 0
    WHEN abs(a - b) = 0 THEN w
    WHEN abs(a - b) <= 2 THEN round(w * 0.9)::int
    WHEN abs(a - b) <= 5 THEN round(w * 0.6)::int
    WHEN abs(a - b) <= 10 THEN round(w * 0.3)::int
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.mf_place_pts(a uuid, b uuid, w int) RETURNS int
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN a IS NOT NULL AND a = b THEN w ELSE 0 END;  -- district half-credit: B9b
$$;

-- ── the authoritative scorer ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.score_pair(p_a uuid, p_b uuid)
RETURNS TABLE(score int, breakdown jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE
  a public.match_features%ROWTYPE;
  b public.match_features%ROWTYPE;
  p_given int; p_surname int; p_father int; p_mother int;
  p_pgf int; p_pgm int; p_mgf int; p_mgm int;
  p_spouse int; p_origin int; p_birth int; p_bplace int; p_death int; p_dplace int; p_email int;
  p_children int;
  sp_lit int; sp_phon int;
  v_score int;
  v_vetoes text[] := ARRAY[]::text[];
  v_privacy text := NULL;
  v_children_delta int;
BEGIN
  SELECT * INTO a FROM public.match_features WHERE person_id = p_a;
  SELECT * INTO b FROM public.match_features WHERE person_id = p_b;
  IF a.person_id IS NULL OR b.person_id IS NULL THEN
    RETURN QUERY SELECT 0, jsonb_build_object('meta',
      jsonb_build_object('version','frs-v1','score',0,'decision','review','error','missing_features'));
    RETURN;
  END IF;

  -- collapsed name fields
  p_given   := public.mf_collapse_pts(a.given_norm,   b.given_norm,   a.given_phon,   b.given_phon,   10);
  p_surname := public.mf_collapse_pts(a.surname_norm, b.surname_norm, a.surname_phon, b.surname_phon, 10);
  p_father  := public.mf_collapse_pts(a.father_norm,  b.father_norm,  a.father_phon,  b.father_phon,  10);
  p_mother  := public.mf_collapse_pts(a.mother_norm,  b.mother_norm,  a.mother_phon,  b.mother_phon,  20);
  p_pgf     := public.mf_collapse_pts(a.pgf_norm, b.pgf_norm, a.pgf_phon, b.pgf_phon, 25);
  p_pgm     := public.mf_collapse_pts(a.pgm_norm, b.pgm_norm, a.pgm_phon, b.pgm_phon, 25);
  p_mgf     := public.mf_collapse_pts(a.mgf_norm, b.mgf_norm, a.mgf_phon, b.mgf_phon, 25);
  p_mgm     := public.mf_collapse_pts(a.mgm_norm, b.mgm_norm, a.mgm_phon, b.mgm_phon, 25);

  -- spouse: any-vs-any (array overlap), collapsed
  sp_lit  := CASE WHEN a.spouse_names_norm && b.spouse_names_norm THEN 25 ELSE 0 END;
  sp_phon := CASE WHEN a.spouse_names_phon && b.spouse_names_phon THEN 25 ELSE 0 END;
  p_spouse := GREATEST(sp_lit, sp_phon) + CASE WHEN sp_lit = 25 THEN 2 ELSE 0 END;

  -- non-name anchors
  p_origin := public.mf_place_pts(a.origin_place_id, b.origin_place_id, 10);
  p_birth  := public.mf_year_pts(a.birth_year, b.birth_year, 25);
  p_bplace := public.mf_place_pts(a.birth_place_id, b.birth_place_id, 25);
  p_death  := public.mf_year_pts(a.death_year, b.death_year, 25);
  p_dplace := public.mf_place_pts(a.death_place_id, b.death_place_id, 25);
  p_email  := CASE WHEN a.email IS NOT NULL AND lower(a.email) = lower(b.email) THEN 25 ELSE 0 END;

  -- number of children (weak/asymmetric): band on |Δ|, never vetoes.
  IF a.num_children IS NULL OR b.num_children IS NULL THEN
    p_children := 0;
  ELSE
    v_children_delta := abs(a.num_children - b.num_children);
    p_children := CASE WHEN v_children_delta = 0 THEN 15
                       WHEN v_children_delta = 1 THEN 9
                       WHEN v_children_delta = 2 THEN 5
                       ELSE 0 END;
  END IF;

  v_score := p_given + p_surname + p_father + p_mother
           + p_pgf + p_pgm + p_mgf + p_mgm + p_spouse
           + p_origin + p_birth + p_bplace + p_death + p_dplace + p_email + p_children;

  -- ── hard vetoes (cap at review; refined gates in B9b) ─────────────────────
  IF (a.gender = 'M' AND b.gender = 'F') OR (a.gender = 'F' AND b.gender = 'M') THEN
    v_vetoes := array_append(v_vetoes, 'gender_mismatch');
  END IF;
  IF a.tree_id = b.tree_id THEN
    v_vetoes := array_append(v_vetoes, 'same_tree');
  END IF;
  IF a.birth_year IS NOT NULL AND b.birth_year IS NOT NULL AND abs(a.birth_year - b.birth_year) > 15 THEN
    v_vetoes := array_append(v_vetoes, 'birth_year_gap');
  END IF;
  IF a.privacy_hold OR b.privacy_hold THEN
    v_vetoes := array_append(v_vetoes, 'privacy_hold');
  END IF;
  IF a.is_living OR b.is_living THEN
    v_privacy := 'living_suppressed';
  END IF;

  RETURN QUERY SELECT v_score, jsonb_build_object(
    'meta', jsonb_build_object(
      'version', 'frs-v1',
      'score', v_score,
      'decision', 'review',            -- full auto-link gate lands in B9b; shadow mode = review
      'vetoes', to_jsonb(v_vetoes),
      'privacy', v_privacy
    ),
    'params', jsonb_build_object(
      'given',      jsonb_build_object('w', 10, 'pts', p_given),
      'surname',    jsonb_build_object('w', 10, 'pts', p_surname),
      'father',     jsonb_build_object('w', 10, 'pts', p_father),
      'mother',     jsonb_build_object('w', 20, 'pts', p_mother),
      'pgf',        jsonb_build_object('w', 25, 'pts', p_pgf),
      'pgm',        jsonb_build_object('w', 25, 'pts', p_pgm),
      'mgf',        jsonb_build_object('w', 25, 'pts', p_mgf),
      'mgm',        jsonb_build_object('w', 25, 'pts', p_mgm),
      'spouse',     jsonb_build_object('w', 25, 'pts', p_spouse),
      'origin',     jsonb_build_object('w', 10, 'pts', p_origin),
      'birth_year', jsonb_build_object('w', 25, 'pts', p_birth),
      'birth_place',jsonb_build_object('w', 25, 'pts', p_bplace),
      'death_year', jsonb_build_object('w', 25, 'pts', p_death),
      'death_place',jsonb_build_object('w', 25, 'pts', p_dplace),
      'email',      jsonb_build_object('w', 25, 'pts', p_email),
      'num_children', jsonb_build_object('w', 15, 'pts', p_children)
    )
  );
END $$;

COMMENT ON FUNCTION public.score_pair IS
  'FRS scorer v1 (core): 25 params, literal+phonetic collapse, hard vetoes, PII-minimized breakdown. Refined cluster/disagreement gating: B9b.';
