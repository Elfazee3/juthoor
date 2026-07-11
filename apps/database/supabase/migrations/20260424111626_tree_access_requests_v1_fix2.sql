
DO $$ BEGIN
  CREATE TYPE public.tree_member_status AS ENUM ('pending','approved','rejected','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tree_members
  ADD COLUMN IF NOT EXISTS status           public.tree_member_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS requested_role   public.tree_role,
  ADD COLUMN IF NOT EXISTS proof_url        text,
  ADD COLUMN IF NOT EXISTS requester_note   text,
  ADD COLUMN IF NOT EXISTS requested_at     timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by      uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Keep the same parameter name (p_tree_id) to preserve policy dependencies
CREATE OR REPLACE FUNCTION public.can_access_tree(p_tree_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trees t
    WHERE t.id = p_tree_id
      AND (
        t.is_public
        OR t.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.tree_members tm
          WHERE tm.tree_id = t.id
            AND tm.user_id = auth.uid()
            AND tm.status  = 'approved'
        )
      )
  );
$$;

DROP POLICY IF EXISTS tree_members_owner_sees_pending ON public.tree_members;
CREATE POLICY tree_members_owner_sees_pending ON public.tree_members
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trees t WHERE t.id = tree_members.tree_id AND t.owner_id = auth.uid()));

DROP POLICY IF EXISTS tree_members_requester_sees_own ON public.tree_members;
CREATE POLICY tree_members_requester_sees_own ON public.tree_members
  FOR SELECT USING (user_id = auth.uid());
