-- Decision D1: the owner of a record controls its non-mandatory information.
--
-- The owner of the record is the registered account a person record describes. For a LIVING
-- person (decision D2) the non-mandatory information is readable and editable only by:
--   * the owner of the record;
--   * the tree's IFT Administrator (trees.owner_id). While no account is linked to the person the
--     IFT Administrator keeps control. Once an account is linked, the IFT Administrator can edit
--     only with a permission the owner granted (person_access_grants); they can still read;
--   * anyone the owner granted access to (read and write, if they can write the tree);
--   * the Platform Administrator, who reads but never edits people.
-- Everyone else (collaborators, members, readers) sees none of it. Deceased people are unchanged.
--
-- Mandatory information stays open to the tree's writers: names, parents, year and place of birth,
-- origin. Death events are treated like birth events (they decide whether a person is living).
--
-- Covered here: events other than birth and death, extra (non-primary) names, photos and
-- documents (person_attachments), and free-text notes (moved to person_notes, because a row-level
-- policy cannot hide one column of persons). The UNRWA and family-card numbers join once they merge.

-- ── 1. the owner of the record ───────────────────────────────────────────────
ALTER TABLE public.persons
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_persons_owner_user
  ON public.persons (owner_user_id) WHERE owner_user_id IS NOT NULL;
COMMENT ON COLUMN public.persons.owner_user_id IS
  'Owner of the record (D1): the account this person is linked to. Set only through claim_person; one person per account.';

-- Ordinary requests cannot set or change the owner: only claim_person / release_person can.
CREATE OR REPLACE FUNCTION public.persons_guard_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.owner_user_id := NULL;
    ELSE
      NEW.owner_user_id := OLD.owner_user_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_persons_guard_owner ON public.persons;
CREATE TRIGGER trg_persons_guard_owner
  BEFORE INSERT OR UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION public.persons_guard_owner();

-- ── 2. permission grants ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.person_access_grants (
  person_id        uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  grantee_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, grantee_user_id)
);
ALTER TABLE public.person_access_grants ENABLE ROW LEVEL SECURITY;
-- Read-only through the API; the owner of the record changes grants with grant_person_access.
DROP POLICY IF EXISTS person_access_grants_select ON public.person_access_grants;
CREATE POLICY person_access_grants_select ON public.person_access_grants
  FOR SELECT TO authenticated
  USING (
    grantee_user_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND p.owner_user_id = auth.uid())
  );
COMMENT ON TABLE public.person_access_grants IS
  'Permissions the owner of a record (D1) grants, for example to the IFT Administrator, to read and edit its non-mandatory information.';

-- ── 3. who may see or change a living person's non-mandatory information ─────
CREATE OR REPLACE FUNCTION public.person_detail_access(p_person uuid, p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    WHEN NOT public.is_person_living(p_person) THEN true        -- deceased: the tree's rules apply
    ELSE EXISTS (
      SELECT 1
        FROM public.persons p
        JOIN public.trees t ON t.id = p.tree_id
       WHERE p.id = p_person
         AND (
           p.owner_user_id = auth.uid()
           OR (t.owner_id = auth.uid()
               AND (NOT p_write OR p.owner_user_id IS NULL OR EXISTS (
                      SELECT 1 FROM public.person_access_grants g
                       WHERE g.person_id = p.id AND g.grantee_user_id = auth.uid())))
           OR EXISTS (SELECT 1 FROM public.person_access_grants g
                       WHERE g.person_id = p.id AND g.grantee_user_id = auth.uid())
           OR (NOT p_write AND public.is_admin())
         )
    )
  END;
$$;

-- A marriage or divorce belongs to both partners: every living partner must allow it.
CREATE OR REPLACE FUNCTION public.family_detail_access(p_family uuid, p_write boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT NOT EXISTS (
    SELECT 1
      FROM public.families f
      CROSS JOIN LATERAL (VALUES (f.partner1_id), (f.partner2_id)) AS pt(person_id)
     WHERE f.id = p_family AND pt.person_id IS NOT NULL
       AND NOT public.person_detail_access(pt.person_id, p_write)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_record_owner(p_person uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.persons p WHERE p.id = p_person AND p.owner_user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.person_detail_access(uuid, boolean), public.family_detail_access(uuid, boolean),
  public.is_record_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.person_detail_access(uuid, boolean), public.family_detail_access(uuid, boolean),
  public.is_record_owner(uuid) TO authenticated;

-- ── 4. events: restrictive rules on top of the tree rules ────────────────────
-- Restrictive policies are ANDed with the existing ones. Birth and death events stay open to the
-- tree's writers (names, year and place of birth are mandatory).
DROP POLICY IF EXISTS events_d1_select ON public.events;
CREATE POLICY events_d1_select ON public.events AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    event_type IN ('BIRT', 'DEAT')
    OR (person_id IS NOT NULL AND public.person_detail_access(person_id, false))
    OR (family_id IS NOT NULL AND public.family_detail_access(family_id, false))
  );
DROP POLICY IF EXISTS events_d1_insert ON public.events;
CREATE POLICY events_d1_insert ON public.events AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    event_type IN ('BIRT', 'DEAT')
    OR (person_id IS NOT NULL AND public.person_detail_access(person_id, true))
    OR (family_id IS NOT NULL AND public.family_detail_access(family_id, true))
  );
DROP POLICY IF EXISTS events_d1_update ON public.events;
CREATE POLICY events_d1_update ON public.events AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    event_type IN ('BIRT', 'DEAT')
    OR (person_id IS NOT NULL AND public.person_detail_access(person_id, true))
    OR (family_id IS NOT NULL AND public.family_detail_access(family_id, true))
  );
DROP POLICY IF EXISTS events_d1_delete ON public.events;
CREATE POLICY events_d1_delete ON public.events AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    event_type IN ('BIRT', 'DEAT')
    OR (person_id IS NOT NULL AND public.person_detail_access(person_id, true))
    OR (family_id IS NOT NULL AND public.family_detail_access(family_id, true))
  );
-- The owner of the record can also edit their own events without being a writer of the tree.
DROP POLICY IF EXISTS events_owner_write ON public.events;
CREATE POLICY events_owner_write ON public.events FOR ALL TO authenticated
  USING (person_id IS NOT NULL AND public.is_record_owner(person_id))
  WITH CHECK (person_id IS NOT NULL AND public.is_record_owner(person_id));

-- ── 5. extra names ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS person_names_d1_select ON public.person_names;
CREATE POLICY person_names_d1_select ON public.person_names AS RESTRICTIVE FOR SELECT TO authenticated
  USING (is_primary OR public.person_detail_access(person_id, false));
DROP POLICY IF EXISTS person_names_d1_insert ON public.person_names;
CREATE POLICY person_names_d1_insert ON public.person_names AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (is_primary OR public.person_detail_access(person_id, true));
DROP POLICY IF EXISTS person_names_d1_update ON public.person_names;
CREATE POLICY person_names_d1_update ON public.person_names AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_primary OR public.person_detail_access(person_id, true));
DROP POLICY IF EXISTS person_names_d1_delete ON public.person_names;
CREATE POLICY person_names_d1_delete ON public.person_names AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_primary OR public.person_detail_access(person_id, true));
DROP POLICY IF EXISTS person_names_owner_write ON public.person_names;
CREATE POLICY person_names_owner_write ON public.person_names FOR ALL TO authenticated
  USING (public.is_record_owner(person_id)) WITH CHECK (public.is_record_owner(person_id));

-- ── 6. photos and documents ──────────────────────────────────────────────────
DROP POLICY IF EXISTS person_attachments_d1_select ON public.person_attachments;
CREATE POLICY person_attachments_d1_select ON public.person_attachments AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.person_detail_access(person_id, false));
DROP POLICY IF EXISTS person_attachments_d1_insert ON public.person_attachments;
CREATE POLICY person_attachments_d1_insert ON public.person_attachments AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.person_detail_access(person_id, true));
DROP POLICY IF EXISTS person_attachments_d1_update ON public.person_attachments;
CREATE POLICY person_attachments_d1_update ON public.person_attachments AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.person_detail_access(person_id, true));
DROP POLICY IF EXISTS person_attachments_d1_delete ON public.person_attachments;
CREATE POLICY person_attachments_d1_delete ON public.person_attachments AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.person_detail_access(person_id, true));

-- ── 7. notes: a table of their own ───────────────────────────────────────────
-- persons.notes keeps only the system value 'placeholder'. Free-text notes move here, where a
-- policy can hide them.
CREATE TABLE IF NOT EXISTS public.person_notes (
  person_id   uuid PRIMARY KEY REFERENCES public.persons(id) ON DELETE CASCADE,
  body        text NOT NULL CHECK (length(btrim(body)) > 0),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.person_notes ENABLE ROW LEVEL SECURITY;

INSERT INTO public.person_notes (person_id, body)
  SELECT id, notes FROM public.persons
   WHERE notes IS NOT NULL AND btrim(notes) <> '' AND notes <> 'placeholder'
ON CONFLICT (person_id) DO NOTHING;
UPDATE public.persons SET notes = NULL WHERE notes IS NOT NULL AND notes <> 'placeholder';

DROP POLICY IF EXISTS person_notes_select ON public.person_notes;
CREATE POLICY person_notes_select ON public.person_notes FOR SELECT TO authenticated
  USING (
    public.person_detail_access(person_id, false)
    AND EXISTS (SELECT 1 FROM public.persons p
                 WHERE p.id = person_id AND (public.can_access_tree(p.tree_id) OR public.is_admin()))
  );
DROP POLICY IF EXISTS person_notes_write ON public.person_notes;
CREATE POLICY person_notes_write ON public.person_notes FOR ALL TO authenticated
  USING (
    public.is_record_owner(person_id)
    OR (public.person_detail_access(person_id, true)
        AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND public.can_write_tree(p.tree_id)))
  )
  WITH CHECK (
    public.is_record_owner(person_id)
    OR (public.person_detail_access(person_id, true)
        AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = person_id AND public.can_write_tree(p.tree_id)))
  );
COMMENT ON TABLE public.person_notes IS
  'Free-text notes about a person. For a living person only the owner of the record, the IFT Administrator and grantees can read them (D1).';

-- ── 8. claiming a record, granting access ────────────────────────────────────
-- D10: a registered user confirms that a person record is them, with no further check.
CREATE OR REPLACE FUNCTION public.claim_person(p_person uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tree uuid;
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000'; END IF;
  SELECT tree_id, owner_user_id INTO v_tree, v_owner FROM public.persons WHERE id = p_person;
  IF v_tree IS NULL THEN RAISE EXCEPTION 'person_not_found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.can_access_tree(v_tree) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  IF NOT public.is_person_living(p_person) THEN RAISE EXCEPTION 'person_not_living' USING ERRCODE = '22023'; END IF;
  IF v_owner IS NOT NULL THEN RAISE EXCEPTION 'already_claimed' USING ERRCODE = '23505'; END IF;
  IF EXISTS (SELECT 1 FROM public.persons WHERE owner_user_id = v_uid) THEN
    RAISE EXCEPTION 'account_already_linked' USING ERRCODE = '23505';
  END IF;
  UPDATE public.persons SET owner_user_id = v_uid WHERE id = p_person;
END $$;

-- The owner lets go of the record. Grants end with it.
CREATE OR REPLACE FUNCTION public.release_person(p_person uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_record_owner(p_person) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.person_access_grants WHERE person_id = p_person;
  UPDATE public.persons SET owner_user_id = NULL WHERE id = p_person;
END $$;

-- The owner lets someone read and edit the non-mandatory information, typically the IFT Administrator.
CREATE OR REPLACE FUNCTION public.grant_person_access(p_person uuid, p_grantee uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_record_owner(p_person) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  IF p_grantee = auth.uid() THEN RAISE EXCEPTION 'grantee_is_owner' USING ERRCODE = '22023'; END IF;
  -- only someone who can work on the person's tree: its IFT Administrator or an approved collaborator
  IF NOT EXISTS (
    SELECT 1 FROM public.persons p JOIN public.trees t ON t.id = p.tree_id
     WHERE p.id = p_person
       AND (t.owner_id = p_grantee
            OR EXISTS (SELECT 1 FROM public.tree_members m
                        WHERE m.tree_id = t.id AND m.user_id = p_grantee
                          AND m.status = 'approved' AND m.role IN ('owner', 'collaborator')))
  ) THEN
    RAISE EXCEPTION 'grantee_not_in_tree' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.person_access_grants (person_id, grantee_user_id, granted_by)
    VALUES (p_person, p_grantee, auth.uid())
  ON CONFLICT (person_id, grantee_user_id) DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.revoke_person_access(p_person uuid, p_grantee uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_record_owner(p_person) THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  DELETE FROM public.person_access_grants WHERE person_id = p_person AND grantee_user_id = p_grantee;
END $$;

REVOKE ALL ON FUNCTION public.claim_person(uuid), public.release_person(uuid),
  public.grant_person_access(uuid, uuid), public.revoke_person_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_person(uuid), public.release_person(uuid),
  public.grant_person_access(uuid, uuid), public.revoke_person_access(uuid, uuid) TO authenticated;
