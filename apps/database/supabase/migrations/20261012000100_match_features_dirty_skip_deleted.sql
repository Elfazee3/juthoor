-- ============================================================================
-- Bug fix: deleting a person (or a whole tree) always failed.
-- ----------------------------------------------------------------------------
-- The match-feature AFTER triggers (persons, person_names, events, families,
-- family_children) call enqueue_match_features_dirty() with the id of the row
-- being deleted. match_features_dirty.person_id references persons(id), so
-- enqueuing a person that no longer exists raised
--   23503 insert or update on table "match_features_dirty" violates foreign key
--         constraint "match_features_dirty_person_id_fkey"
-- and aborted the whole delete (deletePerson, the add-relative rollback, and
-- tree deletion via cascade).
--
-- Fix: only enqueue persons that still exist. A deleted person's own feature
-- row is removed by the match_features FK cascade.
--
-- Follow-up: when a parent is deleted, the FK `ON DELETE SET NULL` clears it
-- from families BEFORE the persons trigger runs, so the parent's children were
-- never re-enqueued and kept the deleted parent's name in their feature vector.
-- trg_mf_families now also enqueues the family's children (and, through the
-- enqueue fan-out, their descendants) whenever a partner slot changes.
-- Otherwise identical to 20260711040000_match_features_layer.sql.
-- ============================================================================

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
    -- skip persons deleted in this statement (FK to persons would abort the delete)
    AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = s.pid)
  ON CONFLICT (person_id) DO UPDATE SET enqueued_at = now();
$$;

CREATE OR REPLACE FUNCTION public.trg_mf_families() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_child uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM public.enqueue_match_features_dirty(OLD.partner1_id);
    PERFORM public.enqueue_match_features_dirty(OLD.partner2_id);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    PERFORM public.enqueue_match_features_dirty(NEW.partner1_id);
    PERFORM public.enqueue_match_features_dirty(NEW.partner2_id);
  END IF;
  -- a parent slot changed (incl. SET NULL after a parent was deleted): the
  -- children's father/mother/grandparent features changed with it.
  IF TG_OP = 'UPDATE'
     AND (NEW.partner1_id IS DISTINCT FROM OLD.partner1_id
          OR NEW.partner2_id IS DISTINCT FROM OLD.partner2_id) THEN
    FOR v_child IN SELECT child_id FROM public.family_children WHERE family_id = NEW.id LOOP
      PERFORM public.enqueue_match_features_dirty(v_child);
    END LOOP;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
