-- M1 feature layer (matching engine, plan §6/§7-M1): the per-person comparison
-- vector, the incremental dirty queue, and the derivation triggers that keep it
-- fed. Feature COMPUTATION (refresh_match_features) is added in the next M1 step
-- once transliterate_to_arabic (B8) exists — this migration lands the table, the
-- queue, and the triggers whose enqueue is the SOLE incremental probe source.

-- ── match_features — one comparison vector per person (deny-all RLS) ─────────
CREATE TABLE IF NOT EXISTS public.match_features (
  person_id           uuid PRIMARY KEY REFERENCES public.persons(id) ON DELETE CASCADE,
  tree_id             uuid NOT NULL,
  gender              gender_type,
  is_living           boolean NOT NULL DEFAULT true,
  privacy_hold        boolean NOT NULL DEFAULT false,
  is_anchor           boolean NOT NULL DEFAULT false,
  -- script-folded (Latin→Arabic via B8) then normalized / phonetic
  given_norm          text, given_phon   text,
  surname_norm        text, surname_phon text,
  father_norm         text, father_phon  text,
  mother_norm         text, mother_phon  text,
  spouse_names_norm   text[], spouse_names_phon text[],
  pgf_norm text, pgf_phon text,   -- paternal grandfather
  pgm_norm text, pgm_phon text,   -- paternal grandmother
  mgf_norm text, mgf_phon text,   -- maternal grandfather
  mgm_norm text, mgm_phon text,   -- maternal grandmother
  num_children        integer NOT NULL DEFAULT 0,
  birth_year          smallint, birth_place_id uuid,
  death_year          smallint, death_place_id uuid,
  origin_place_id     uuid,
  email               text,
  features_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_features_tree ON public.match_features (tree_id);
CREATE INDEX IF NOT EXISTS idx_match_features_birth_year ON public.match_features (birth_year);
CREATE INDEX IF NOT EXISTS idx_match_features_origin ON public.match_features (origin_place_id);
CREATE INDEX IF NOT EXISTS idx_match_features_anchor ON public.match_features (person_id) WHERE is_anchor;
CREATE INDEX IF NOT EXISTS idx_match_features_hold ON public.match_features (person_id) WHERE privacy_hold;

-- Engine-internal: deny-all (RLS on, no policies → only service_role / definer).
ALTER TABLE public.match_features ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.match_features IS
  'One comparison vector per person (script-folded names, life facts). Engine-internal, deny-all RLS; written by the batch (service_role) via refresh_match_features.';

-- ── match_features_dirty — the incremental recompute queue ──────────────────
CREATE TABLE IF NOT EXISTS public.match_features_dirty (
  person_id   uuid PRIMARY KEY REFERENCES public.persons(id) ON DELETE CASCADE,
  enqueued_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.match_features_dirty ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.match_features_dirty IS
  'The SOLE incremental probe source for the matcher (persons.updated_at is not bumped by child-table edits). Fed by AFTER triggers on every source table.';

-- ── enqueue: a person + transitive dependents whose vector depends on them ──
CREATE OR REPLACE FUNCTION public.enqueue_match_features_dirty(p_person_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO public.match_features_dirty (person_id)
  SELECT pid FROM (
    SELECT p_person_id AS pid
    UNION
    -- children (their father/mother features depend on this person)
    SELECT fc.child_id
      FROM public.families fam
      JOIN public.family_children fc ON fc.family_id = fam.id
      WHERE fam.partner1_id = p_person_id OR fam.partner2_id = p_person_id
    UNION
    -- grandchildren (their grandparent features depend on this person)
    SELECT fc2.child_id
      FROM public.families fam
      JOIN public.family_children fc ON fc.family_id = fam.id
      JOIN public.families fam2 ON fam2.partner1_id = fc.child_id OR fam2.partner2_id = fc.child_id
      JOIN public.family_children fc2 ON fc2.family_id = fam2.id
      WHERE fam.partner1_id = p_person_id OR fam.partner2_id = p_person_id
    UNION
    -- spouses (their spouse-name features depend on this person)
    SELECT CASE WHEN fam.partner1_id = p_person_id THEN fam.partner2_id ELSE fam.partner1_id END
      FROM public.families fam
      WHERE fam.partner1_id = p_person_id OR fam.partner2_id = p_person_id
  ) s
  WHERE pid IS NOT NULL
  ON CONFLICT (person_id) DO UPDATE SET enqueued_at = now();
$$;

-- ── derivation triggers on every source table ───────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_mf_persons() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.enqueue_match_features_dirty(COALESCE(NEW.id, OLD.id));
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION public.trg_mf_person_id() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM public.enqueue_match_features_dirty(COALESCE(NEW.person_id, OLD.person_id));
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION public.trg_mf_families() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM public.enqueue_match_features_dirty(OLD.partner1_id);
    PERFORM public.enqueue_match_features_dirty(OLD.partner2_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM public.enqueue_match_features_dirty(NEW.partner1_id);
    PERFORM public.enqueue_match_features_dirty(NEW.partner2_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE OR REPLACE FUNCTION public.trg_mf_family_children() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_family uuid := COALESCE(NEW.family_id, OLD.family_id);
  v_p1 uuid;
  v_p2 uuid;
BEGIN
  PERFORM public.enqueue_match_features_dirty(COALESCE(NEW.child_id, OLD.child_id));
  SELECT partner1_id, partner2_id INTO v_p1, v_p2 FROM public.families WHERE id = v_family;
  PERFORM public.enqueue_match_features_dirty(v_p1);
  PERFORM public.enqueue_match_features_dirty(v_p2);
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_mf_persons ON public.persons;
CREATE TRIGGER trg_mf_persons AFTER INSERT OR UPDATE OR DELETE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.trg_mf_persons();

DROP TRIGGER IF EXISTS trg_mf_person_names ON public.person_names;
CREATE TRIGGER trg_mf_person_names AFTER INSERT OR UPDATE OR DELETE ON public.person_names
  FOR EACH ROW EXECUTE FUNCTION public.trg_mf_person_id();

DROP TRIGGER IF EXISTS trg_mf_events ON public.events;
CREATE TRIGGER trg_mf_events AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.trg_mf_person_id();

DROP TRIGGER IF EXISTS trg_mf_privacy_holds ON public.person_privacy_holds;
CREATE TRIGGER trg_mf_privacy_holds AFTER INSERT OR UPDATE OR DELETE ON public.person_privacy_holds
  FOR EACH ROW EXECUTE FUNCTION public.trg_mf_person_id();

DROP TRIGGER IF EXISTS trg_mf_families ON public.families;
CREATE TRIGGER trg_mf_families AFTER INSERT OR UPDATE OR DELETE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.trg_mf_families();

DROP TRIGGER IF EXISTS trg_mf_family_children ON public.family_children;
CREATE TRIGGER trg_mf_family_children AFTER INSERT OR UPDATE OR DELETE ON public.family_children
  FOR EACH ROW EXECUTE FUNCTION public.trg_mf_family_children();
