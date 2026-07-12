-- M1 (B9b): the refined auto-link gate on top of the B9 scoring core (plan §4).
-- Adds evidence-cluster gating (≥2 clusters agree incl. a non-patriline
-- corroborator), score_pct over clusters, disagreement vetoes (present-but-
-- different mother/spouse/origin/maternal-grandparents/birth-year), and sets
-- meta.decision. Shadow mode (app_settings.auto_merge_enabled=false) still forces
-- everything to review in the batch — this only gates M4 auto-link.

CREATE OR REPLACE FUNCTION public.mf_present(a text, b text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT a IS NOT NULL AND a <> '' AND b IS NOT NULL AND b <> '';
$$;

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
  -- clusters
  patri_max int; patri_pts int; mat_max int; mat_pts int; sp_max int; anc_max int; anc_pts int;
  v_max int; v_score_pct numeric := 0; v_clusters int := 0; v_nonpatri boolean := false;
  patri_ok boolean; mat_ok boolean; sp_ok boolean; anc_ok boolean;
  v_threshold int; v_floor numeric; v_decision text;
  both_spouses boolean;
BEGIN
  SELECT * INTO a FROM public.match_features WHERE person_id = p_a;
  SELECT * INTO b FROM public.match_features WHERE person_id = p_b;
  IF a.person_id IS NULL OR b.person_id IS NULL THEN
    RETURN QUERY SELECT 0, jsonb_build_object('meta',
      jsonb_build_object('version','frs-v1','score',0,'decision','review','error','missing_features'));
    RETURN;
  END IF;

  p_given   := public.mf_collapse_pts(a.given_norm,   b.given_norm,   a.given_phon,   b.given_phon,   10);
  p_surname := public.mf_collapse_pts(a.surname_norm, b.surname_norm, a.surname_phon, b.surname_phon, 10);
  p_father  := public.mf_collapse_pts(a.father_norm,  b.father_norm,  a.father_phon,  b.father_phon,  10);
  p_mother  := public.mf_collapse_pts(a.mother_norm,  b.mother_norm,  a.mother_phon,  b.mother_phon,  20);
  p_pgf     := public.mf_collapse_pts(a.pgf_norm, b.pgf_norm, a.pgf_phon, b.pgf_phon, 25);
  p_pgm     := public.mf_collapse_pts(a.pgm_norm, b.pgm_norm, a.pgm_phon, b.pgm_phon, 25);
  p_mgf     := public.mf_collapse_pts(a.mgf_norm, b.mgf_norm, a.mgf_phon, b.mgf_phon, 25);
  p_mgm     := public.mf_collapse_pts(a.mgm_norm, b.mgm_norm, a.mgm_phon, b.mgm_phon, 25);

  both_spouses := a.spouse_names_norm IS NOT NULL AND array_length(a.spouse_names_norm,1) > 0
              AND b.spouse_names_norm IS NOT NULL AND array_length(b.spouse_names_norm,1) > 0;
  sp_lit  := CASE WHEN a.spouse_names_norm && b.spouse_names_norm THEN 25 ELSE 0 END;
  sp_phon := CASE WHEN a.spouse_names_phon && b.spouse_names_phon THEN 25 ELSE 0 END;
  p_spouse := GREATEST(sp_lit, sp_phon) + CASE WHEN sp_lit = 25 THEN 2 ELSE 0 END;

  p_origin := public.mf_place_pts(a.origin_place_id, b.origin_place_id, 10);
  p_birth  := public.mf_year_pts(a.birth_year, b.birth_year, 25);
  p_bplace := public.mf_place_pts(a.birth_place_id, b.birth_place_id, 25);
  p_death  := public.mf_year_pts(a.death_year, b.death_year, 25);
  p_dplace := public.mf_place_pts(a.death_place_id, b.death_place_id, 25);
  p_email  := CASE WHEN a.email IS NOT NULL AND lower(a.email) = lower(b.email) THEN 25 ELSE 0 END;

  IF a.num_children IS NULL OR b.num_children IS NULL THEN
    p_children := 0;
  ELSE
    v_children_delta := abs(a.num_children - b.num_children);
    p_children := CASE WHEN v_children_delta=0 THEN 15 WHEN v_children_delta=1 THEN 9
                       WHEN v_children_delta=2 THEN 5 ELSE 0 END;
  END IF;

  v_score := p_given+p_surname+p_father+p_mother+p_pgf+p_pgm+p_mgf+p_mgm+p_spouse
           + p_origin+p_birth+p_bplace+p_death+p_dplace+p_email+p_children;

  -- ── evidence clusters (num_children excluded from score_pct) ──────────────
  patri_max := (CASE WHEN public.mf_present(a.given_norm,b.given_norm)   THEN 10 ELSE 0 END)
             + (CASE WHEN public.mf_present(a.father_norm,b.father_norm) THEN 10 ELSE 0 END)
             + (CASE WHEN public.mf_present(a.pgf_norm,b.pgf_norm)       THEN 25 ELSE 0 END)
             + (CASE WHEN public.mf_present(a.pgm_norm,b.pgm_norm)       THEN 25 ELSE 0 END);
  patri_pts := p_given + p_father + p_pgf + p_pgm;
  mat_max   := (CASE WHEN public.mf_present(a.mother_norm,b.mother_norm) THEN 20 ELSE 0 END)
             + (CASE WHEN public.mf_present(a.mgf_norm,b.mgf_norm)       THEN 25 ELSE 0 END)
             + (CASE WHEN public.mf_present(a.mgm_norm,b.mgm_norm)       THEN 25 ELSE 0 END);
  mat_pts   := p_mother + p_mgf + p_mgm;
  sp_max    := CASE WHEN both_spouses THEN 25 ELSE 0 END;
  anc_max   := (CASE WHEN a.origin_place_id IS NOT NULL AND b.origin_place_id IS NOT NULL THEN 10 ELSE 0 END)
             + (CASE WHEN a.birth_year IS NOT NULL AND b.birth_year IS NOT NULL THEN 25 ELSE 0 END)
             + (CASE WHEN a.birth_place_id IS NOT NULL AND b.birth_place_id IS NOT NULL THEN 25 ELSE 0 END)
             + (CASE WHEN a.death_year IS NOT NULL AND b.death_year IS NOT NULL THEN 25 ELSE 0 END)
             + (CASE WHEN a.death_place_id IS NOT NULL AND b.death_place_id IS NOT NULL THEN 25 ELSE 0 END)
             + (CASE WHEN a.email IS NOT NULL AND b.email IS NOT NULL THEN 25 ELSE 0 END);
  anc_pts   := p_origin + p_birth + p_bplace + p_death + p_dplace + p_email;

  v_max := patri_max + mat_max + sp_max + anc_max;
  IF v_max > 0 THEN
    -- +2 collapse bonuses can push clustered pts slightly over the clustered max.
    v_score_pct := LEAST(1.0, round((patri_pts + mat_pts + p_spouse + anc_pts)::numeric / v_max, 3));
  END IF;

  patri_ok := patri_max > 0 AND patri_pts >= 0.6 * patri_max;
  mat_ok   := mat_max   > 0 AND mat_pts   >= 0.6 * mat_max;
  sp_ok    := sp_max    > 0 AND p_spouse  >= 0.6 * sp_max;
  anc_ok   := anc_max   > 0 AND anc_pts   >= 0.6 * anc_max;
  v_clusters := (CASE WHEN patri_ok THEN 1 ELSE 0 END) + (CASE WHEN mat_ok THEN 1 ELSE 0 END)
              + (CASE WHEN sp_ok THEN 1 ELSE 0 END) + (CASE WHEN anc_ok THEN 1 ELSE 0 END);
  v_nonpatri := mat_ok OR sp_ok OR anc_ok;

  -- ── hard vetoes ───────────────────────────────────────────────────────────
  IF (a.gender='M' AND b.gender='F') OR (a.gender='F' AND b.gender='M') THEN v_vetoes := array_append(v_vetoes,'gender_mismatch'); END IF;
  IF a.tree_id = b.tree_id THEN v_vetoes := array_append(v_vetoes,'same_tree'); END IF;
  IF a.birth_year IS NOT NULL AND b.birth_year IS NOT NULL AND abs(a.birth_year-b.birth_year) > 15 THEN v_vetoes := array_append(v_vetoes,'birth_year_gap'); END IF;
  IF a.privacy_hold OR b.privacy_hold THEN v_vetoes := array_append(v_vetoes,'privacy_hold'); END IF;
  IF a.is_living OR b.is_living THEN v_privacy := 'living_suppressed'; END IF;

  -- ── disagreement vetoes (present-but-different) ───────────────────────────
  IF public.mf_present(a.mother_norm,b.mother_norm) AND p_mother < 8 THEN v_vetoes := array_append(v_vetoes,'mother_disagree'); END IF;
  IF both_spouses AND p_spouse = 0 THEN v_vetoes := array_append(v_vetoes,'spouse_disagree'); END IF;
  IF a.origin_place_id IS NOT NULL AND b.origin_place_id IS NOT NULL AND a.origin_place_id <> b.origin_place_id THEN v_vetoes := array_append(v_vetoes,'origin_disagree'); END IF;
  IF public.mf_present(a.mgf_norm,b.mgf_norm) AND p_mgf < 10 THEN v_vetoes := array_append(v_vetoes,'mgp_disagree'); END IF;
  IF a.birth_year IS NOT NULL AND b.birth_year IS NOT NULL AND abs(a.birth_year-b.birth_year) > 10 AND abs(a.birth_year-b.birth_year) <= 15 THEN v_vetoes := array_append(v_vetoes,'birth_year_disagree'); END IF;

  -- ── decision ──────────────────────────────────────────────────────────────
  SELECT auto_merge_threshold, score_pct_floor INTO v_threshold, v_floor FROM public.app_settings LIMIT 1;
  v_threshold := COALESCE(v_threshold, 450);
  v_floor := COALESCE(v_floor, 0.78);

  IF coalesce(array_length(v_vetoes,1),0) = 0
     AND v_privacy IS NULL
     AND v_score >= v_threshold
     AND v_score_pct >= v_floor
     AND v_clusters >= 2
     AND v_nonpatri THEN
    v_decision := 'auto_link';
  ELSE
    v_decision := 'review';
  END IF;

  RETURN QUERY SELECT v_score, jsonb_build_object(
    'meta', jsonb_build_object(
      'version','frs-v1','score',v_score,'max_attainable',v_max,'score_pct',v_score_pct,
      'clusters_agreed',v_clusters,'decision',v_decision,
      'vetoes',to_jsonb(v_vetoes),'privacy',v_privacy),
    'params', jsonb_build_object(
      'given',jsonb_build_object('w',10,'pts',p_given),
      'surname',jsonb_build_object('w',10,'pts',p_surname),
      'father',jsonb_build_object('w',10,'pts',p_father),
      'mother',jsonb_build_object('w',20,'pts',p_mother),
      'pgf',jsonb_build_object('w',25,'pts',p_pgf),
      'pgm',jsonb_build_object('w',25,'pts',p_pgm),
      'mgf',jsonb_build_object('w',25,'pts',p_mgf),
      'mgm',jsonb_build_object('w',25,'pts',p_mgm),
      'spouse',jsonb_build_object('w',25,'pts',p_spouse),
      'origin',jsonb_build_object('w',10,'pts',p_origin),
      'birth_year',jsonb_build_object('w',25,'pts',p_birth),
      'birth_place',jsonb_build_object('w',25,'pts',p_bplace),
      'death_year',jsonb_build_object('w',25,'pts',p_death),
      'death_place',jsonb_build_object('w',25,'pts',p_dplace),
      'email',jsonb_build_object('w',25,'pts',p_email),
      'num_children',jsonb_build_object('w',15,'pts',p_children))
  );
END $$;
