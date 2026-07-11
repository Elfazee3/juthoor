-- M1 (B8b): compute the per-person feature vector. Names are folded
-- transliterate_to_arabic → normalize_arabic / arabic_phonetic so cross-script
-- variants unify. Parent resolution mirrors lib/tree/relationships.ts
-- resolveParents EXACTLY (M→father, F→mother, else partner-position fallback;
-- handles U/X and same-gender partners).

-- ── parent resolution (parity with resolveParents) ──────────────────────────
CREATE OR REPLACE FUNCTION public.match_resolve_parents(p_person_id uuid)
RETURNS TABLE(father_id uuid, mother_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_p1 uuid; v_p2 uuid;
  v_g1 public.gender_type; v_g2 public.gender_type;
  v_father uuid; v_mother uuid;
  v_cand uuid; v_g public.gender_type; i int;
BEGIN
  SELECT fam.partner1_id, fam.partner2_id INTO v_p1, v_p2
    FROM public.family_children fc
    JOIN public.families fam ON fam.id = fc.family_id
    WHERE fc.child_id = p_person_id
    LIMIT 1;
  IF NOT FOUND THEN
    father_id := NULL; mother_id := NULL; RETURN NEXT; RETURN;
  END IF;

  SELECT gender INTO v_g1 FROM public.persons WHERE id = v_p1;
  SELECT gender INTO v_g2 FROM public.persons WHERE id = v_p2;

  FOR i IN 1..2 LOOP
    IF i = 1 THEN v_cand := v_p1; v_g := v_g1; ELSE v_cand := v_p2; v_g := v_g2; END IF;
    IF v_cand IS NULL THEN CONTINUE; END IF;
    IF    v_g = 'M' AND v_father IS NULL THEN v_father := v_cand;
    ELSIF v_g = 'F' AND v_mother IS NULL THEN v_mother := v_cand;
    ELSIF v_father IS NULL THEN v_father := v_cand;
    ELSIF v_mother IS NULL THEN v_mother := v_cand;
    END IF;
  END LOOP;

  father_id := v_father; mother_id := v_mother; RETURN NEXT;
END $$;

-- ── folded primary-name helpers (NULL person → NULL) ────────────────────────
CREATE OR REPLACE FUNCTION public.mf_given_norm(p_person_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.normalize_arabic(public.transliterate_to_arabic(pn.given_name))
  FROM public.person_names pn WHERE pn.person_id = p_person_id AND pn.is_primary LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.mf_given_phon(p_person_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.arabic_phonetic(public.transliterate_to_arabic(pn.given_name))
  FROM public.person_names pn WHERE pn.person_id = p_person_id AND pn.is_primary LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.mf_surname_norm(p_person_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.normalize_arabic(public.transliterate_to_arabic(pn.surname))
  FROM public.person_names pn WHERE pn.person_id = p_person_id AND pn.is_primary LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.mf_surname_phon(p_person_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.arabic_phonetic(public.transliterate_to_arabic(pn.surname))
  FROM public.person_names pn WHERE pn.person_id = p_person_id AND pn.is_primary LIMIT 1;
$$;

-- ── refresh one person's feature vector ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_match_features(p_person_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_tree uuid; v_gender public.gender_type;
  v_father uuid; v_mother uuid;
  v_pgf uuid; v_pgm uuid; v_mgf uuid; v_mgm uuid;
  v_birth_year smallint; v_birth_place uuid;
  v_death_year smallint; v_death_place uuid;
  v_spouse_norm text[]; v_spouse_phon text[];
  v_num_children int;
BEGIN
  SELECT tree_id, gender INTO v_tree, v_gender FROM public.persons WHERE id = p_person_id;
  IF NOT FOUND THEN
    DELETE FROM public.match_features WHERE person_id = p_person_id;
    DELETE FROM public.match_features_dirty WHERE person_id = p_person_id;
    RETURN;
  END IF;

  SELECT father_id, mother_id INTO v_father, v_mother FROM public.match_resolve_parents(p_person_id);
  IF v_father IS NOT NULL THEN
    SELECT father_id, mother_id INTO v_pgf, v_pgm FROM public.match_resolve_parents(v_father);
  END IF;
  IF v_mother IS NOT NULL THEN
    SELECT father_id, mother_id INTO v_mgf, v_mgm FROM public.match_resolve_parents(v_mother);
  END IF;

  SELECT date_year, place_id INTO v_birth_year, v_birth_place
    FROM public.events WHERE person_id = p_person_id AND event_type = 'BIRT' LIMIT 1;
  SELECT date_year, place_id INTO v_death_year, v_death_place
    FROM public.events WHERE person_id = p_person_id AND event_type = 'DEAT' LIMIT 1;

  SELECT array_agg(public.mf_given_norm(sp)), array_agg(public.mf_given_phon(sp))
    INTO v_spouse_norm, v_spouse_phon
    FROM (
      SELECT CASE WHEN fam.partner1_id = p_person_id THEN fam.partner2_id ELSE fam.partner1_id END AS sp
      FROM public.families fam
      WHERE fam.partner1_id = p_person_id OR fam.partner2_id = p_person_id
    ) s WHERE sp IS NOT NULL;

  SELECT count(*) INTO v_num_children
    FROM public.families fam JOIN public.family_children fc ON fc.family_id = fam.id
    WHERE fam.partner1_id = p_person_id OR fam.partner2_id = p_person_id;

  INSERT INTO public.match_features (
    person_id, tree_id, gender, is_living, privacy_hold, is_anchor,
    given_norm, given_phon, surname_norm, surname_phon,
    father_norm, father_phon, mother_norm, mother_phon,
    spouse_names_norm, spouse_names_phon,
    pgf_norm, pgf_phon, pgm_norm, pgm_phon, mgf_norm, mgf_phon, mgm_norm, mgm_phon,
    num_children, birth_year, birth_place_id, death_year, death_place_id, origin_place_id, email,
    features_updated_at
  ) VALUES (
    p_person_id, v_tree, v_gender, public.is_person_living(p_person_id),
    EXISTS (SELECT 1 FROM public.person_privacy_holds WHERE person_id = p_person_id),
    false,
    public.mf_given_norm(p_person_id), public.mf_given_phon(p_person_id),
    public.mf_surname_norm(p_person_id), public.mf_surname_phon(p_person_id),
    public.mf_given_norm(v_father), public.mf_given_phon(v_father),
    public.mf_given_norm(v_mother), public.mf_given_phon(v_mother),
    v_spouse_norm, v_spouse_phon,
    public.mf_given_norm(v_pgf), public.mf_given_phon(v_pgf),
    public.mf_given_norm(v_pgm), public.mf_given_phon(v_pgm),
    public.mf_given_norm(v_mgf), public.mf_given_phon(v_mgf),
    public.mf_given_norm(v_mgm), public.mf_given_phon(v_mgm),
    v_num_children, v_birth_year, v_birth_place, v_death_year, v_death_place, v_birth_place, NULL,
    now()
  )
  ON CONFLICT (person_id) DO UPDATE SET
    tree_id = EXCLUDED.tree_id, gender = EXCLUDED.gender, is_living = EXCLUDED.is_living,
    privacy_hold = EXCLUDED.privacy_hold,
    given_norm = EXCLUDED.given_norm, given_phon = EXCLUDED.given_phon,
    surname_norm = EXCLUDED.surname_norm, surname_phon = EXCLUDED.surname_phon,
    father_norm = EXCLUDED.father_norm, father_phon = EXCLUDED.father_phon,
    mother_norm = EXCLUDED.mother_norm, mother_phon = EXCLUDED.mother_phon,
    spouse_names_norm = EXCLUDED.spouse_names_norm, spouse_names_phon = EXCLUDED.spouse_names_phon,
    pgf_norm = EXCLUDED.pgf_norm, pgf_phon = EXCLUDED.pgf_phon,
    pgm_norm = EXCLUDED.pgm_norm, pgm_phon = EXCLUDED.pgm_phon,
    mgf_norm = EXCLUDED.mgf_norm, mgf_phon = EXCLUDED.mgf_phon,
    mgm_norm = EXCLUDED.mgm_norm, mgm_phon = EXCLUDED.mgm_phon,
    num_children = EXCLUDED.num_children,
    birth_year = EXCLUDED.birth_year, birth_place_id = EXCLUDED.birth_place_id,
    death_year = EXCLUDED.death_year, death_place_id = EXCLUDED.death_place_id,
    origin_place_id = EXCLUDED.origin_place_id, features_updated_at = now();

  DELETE FROM public.match_features_dirty WHERE person_id = p_person_id;
END $$;

-- ── drain the dirty queue ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_match_features_batch()
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT person_id FROM public.match_features_dirty LOOP
    PERFORM public.refresh_match_features(r.person_id);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;
