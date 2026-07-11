-- M0 security fix (matching engine, plan §5.4).
--
-- The original "matches_select" policy leaked match rows — the counterparty
-- person id and the full score_breakdown jsonb — to ANY authenticated user who
-- can_access_tree() of either side. Because can_access_tree() is true for every
-- public tree, this exposed the cross-tree linkage graph to all logged-in users.
--
-- Fix: the base public.matches table is now readable by admins only. Owners get
-- match data exclusively through the masked, security_invoker match_review_cards
-- view (added in Phase M3), never from the base table.
DROP POLICY IF EXISTS "matches_select" ON public.matches;

CREATE POLICY "matches_select_admin_only"
  ON public.matches FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "matches_select_admin_only" ON public.matches IS
  'M0 security fix: base matches table is admin-only. Owners read via the masked match_review_cards view, not this table.';
