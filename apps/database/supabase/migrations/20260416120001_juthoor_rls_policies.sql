-- ============================================================================
-- Juthoor — Row Level Security (RLS) Policies
-- ============================================================================
-- Rules:
--   1. Tree owners can CRUD their own tree data
--   2. Tree collaborators can read + write
--   3. Tree read_only members can only read
--   4. Public trees are readable by all authenticated users (Master Tree concept)
--   5. Admin can manage everything
--   6. Places are readable by everyone (public reference data)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Check if user can access a tree (owner, member, or public tree)
CREATE OR REPLACE FUNCTION public.can_access_tree(p_tree_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trees
    WHERE id = p_tree_id
    AND (
      owner_id = auth.uid()
      OR is_public = true
      OR EXISTS (
        SELECT 1 FROM public.tree_members
        WHERE tree_id = p_tree_id AND user_id = auth.uid()
      )
    )
  );
$$;

-- Check if user can write to a tree (owner or collaborator)
CREATE OR REPLACE FUNCTION public.can_write_tree(p_tree_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trees
    WHERE id = p_tree_id
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.tree_members
        WHERE tree_id = p_tree_id
          AND user_id = auth.uid()
          AND role IN ('collaborator')
      )
    )
  );
$$;

-- ============================================================================
-- PLACES — public read, admin write
-- ============================================================================

CREATE POLICY "places_select_all"
  ON public.places FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "places_insert_admin"
  ON public.places FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "places_update_admin"
  ON public.places FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "places_delete_admin"
  ON public.places FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- TREES — owner full access, members can read
-- ============================================================================

CREATE POLICY "trees_select"
  ON public.trees FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_public = true
    OR EXISTS (
      SELECT 1 FROM public.tree_members
      WHERE tree_id = id AND user_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "trees_insert"
  ON public.trees FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "trees_update"
  ON public.trees FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "trees_delete"
  ON public.trees FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

-- ============================================================================
-- TREE MEMBERS — owner manages, members see their own
-- ============================================================================

CREATE POLICY "tree_members_select"
  ON public.tree_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trees WHERE id = tree_id AND owner_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "tree_members_insert"
  ON public.tree_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trees WHERE id = tree_id AND owner_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "tree_members_update"
  ON public.tree_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trees WHERE id = tree_id AND owner_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "tree_members_delete"
  ON public.tree_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.trees WHERE id = tree_id AND owner_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ============================================================================
-- PERSONS — tree-based access
-- ============================================================================

CREATE POLICY "persons_select"
  ON public.persons FOR SELECT
  TO authenticated
  USING (public.can_access_tree(tree_id) OR public.is_admin());

CREATE POLICY "persons_insert"
  ON public.persons FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write_tree(tree_id) OR public.is_admin());

CREATE POLICY "persons_update"
  ON public.persons FOR UPDATE
  TO authenticated
  USING (public.can_write_tree(tree_id) OR public.is_admin());

CREATE POLICY "persons_delete"
  ON public.persons FOR DELETE
  TO authenticated
  USING (public.can_write_tree(tree_id) OR public.is_admin());

-- ============================================================================
-- PERSON NAMES — follows person access
-- ============================================================================

CREATE POLICY "person_names_select"
  ON public.person_names FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND (public.can_access_tree(p.tree_id) OR public.is_admin())
    )
  );

CREATE POLICY "person_names_insert"
  ON public.person_names FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND (public.can_write_tree(p.tree_id) OR public.is_admin())
    )
  );

CREATE POLICY "person_names_update"
  ON public.person_names FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND (public.can_write_tree(p.tree_id) OR public.is_admin())
    )
  );

CREATE POLICY "person_names_delete"
  ON public.person_names FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND (public.can_write_tree(p.tree_id) OR public.is_admin())
    )
  );

-- ============================================================================
-- FAMILIES — tree-based access
-- ============================================================================

CREATE POLICY "families_select"
  ON public.families FOR SELECT
  TO authenticated
  USING (public.can_access_tree(tree_id) OR public.is_admin());

CREATE POLICY "families_insert"
  ON public.families FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write_tree(tree_id) OR public.is_admin());

CREATE POLICY "families_update"
  ON public.families FOR UPDATE
  TO authenticated
  USING (public.can_write_tree(tree_id) OR public.is_admin());

CREATE POLICY "families_delete"
  ON public.families FOR DELETE
  TO authenticated
  USING (public.can_write_tree(tree_id) OR public.is_admin());

-- ============================================================================
-- FAMILY CHILDREN — follows family access
-- ============================================================================

CREATE POLICY "family_children_select"
  ON public.family_children FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND (public.can_access_tree(f.tree_id) OR public.is_admin())
    )
  );

CREATE POLICY "family_children_insert"
  ON public.family_children FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND (public.can_write_tree(f.tree_id) OR public.is_admin())
    )
  );

CREATE POLICY "family_children_update"
  ON public.family_children FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND (public.can_write_tree(f.tree_id) OR public.is_admin())
    )
  );

CREATE POLICY "family_children_delete"
  ON public.family_children FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND (public.can_write_tree(f.tree_id) OR public.is_admin())
    )
  );

-- ============================================================================
-- EVENTS — follows person or family access
-- ============================================================================

CREATE POLICY "events_select"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    (person_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND (public.can_access_tree(p.tree_id) OR public.is_admin())
    ))
    OR
    (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND (public.can_access_tree(f.tree_id) OR public.is_admin())
    ))
  );

CREATE POLICY "events_insert"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    (person_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND (public.can_write_tree(p.tree_id) OR public.is_admin())
    ))
    OR
    (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND (public.can_write_tree(f.tree_id) OR public.is_admin())
    ))
  );

CREATE POLICY "events_update"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    (person_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND (public.can_write_tree(p.tree_id) OR public.is_admin())
    ))
    OR
    (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND (public.can_write_tree(f.tree_id) OR public.is_admin())
    ))
  );

CREATE POLICY "events_delete"
  ON public.events FOR DELETE
  TO authenticated
  USING (
    (person_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.persons p
      WHERE p.id = person_id AND (public.can_write_tree(p.tree_id) OR public.is_admin())
    ))
    OR
    (family_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.families f
      WHERE f.id = family_id AND (public.can_write_tree(f.tree_id) OR public.is_admin())
    ))
  );

-- ============================================================================
-- MATCHES — admin manages, users see their own
-- ============================================================================

CREATE POLICY "matches_select"
  ON public.matches FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.persons p
      WHERE (p.id = person_a_id OR p.id = person_b_id)
        AND public.can_access_tree(p.tree_id)
    )
  );

CREATE POLICY "matches_insert_system"
  ON public.matches FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "matches_update_admin"
  ON public.matches FOR UPDATE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "matches_delete_admin"
  ON public.matches FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- PROFILES — users see/edit their own, admin sees all
-- ============================================================================

CREATE POLICY "profiles_select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "profiles_update"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Profiles are auto-created by trigger, no manual insert needed
-- No delete — tied to auth.users lifecycle
