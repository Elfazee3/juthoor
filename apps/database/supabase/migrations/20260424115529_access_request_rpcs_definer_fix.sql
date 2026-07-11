
-- Fix: RPC must be SECURITY DEFINER to bypass RLS on tree_members INSERT.
-- Authentication/authorization is enforced inside the function body via auth.uid().
CREATE OR REPLACE FUNCTION public.request_tree_access(
  p_tree_id uuid,
  p_role    public.tree_role,
  p_proof_url text,
  p_note    text DEFAULT NULL
) RETURNS public.tree_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.tree_members%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_tree_id IS NULL THEN RAISE EXCEPTION 'tree_id required'; END IF;
  IF p_role IS NULL THEN RAISE EXCEPTION 'role required'; END IF;
  -- Owners can't request access to their own tree
  IF EXISTS (SELECT 1 FROM public.trees WHERE id = p_tree_id AND owner_id = v_uid) THEN
    RAISE EXCEPTION 'You already own this tree';
  END IF;

  SELECT * INTO v_row FROM public.tree_members
    WHERE tree_id = p_tree_id AND user_id = v_uid AND status IN ('approved','pending')
    LIMIT 1;
  IF FOUND THEN RETURN v_row; END IF;

  INSERT INTO public.tree_members(tree_id, user_id, role, status, requested_role, proof_url, requester_note)
    VALUES (p_tree_id, v_uid, 'read_only', 'pending', p_role, p_proof_url, p_note)
    RETURNING * INTO v_row;
  RETURN v_row;
END $$;
GRANT EXECUTE ON FUNCTION public.request_tree_access(uuid, public.tree_role, text, text) TO authenticated;

-- Same for approve/reject — owner-scoped, DEFINER ensures it can update regardless of SELECT RLS quirks
CREATE OR REPLACE FUNCTION public.approve_tree_access_request(p_member_id uuid)
RETURNS public.tree_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.tree_members%ROWTYPE;
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_row FROM public.tree_members WHERE id = p_member_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  SELECT owner_id INTO v_owner FROM public.trees WHERE id = v_row.tree_id;
  IF v_owner <> v_uid THEN RAISE EXCEPTION 'Only tree owner can approve'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;
  UPDATE public.tree_members
    SET status = 'approved',
        role = COALESCE(v_row.requested_role, 'read_only'::public.tree_role),
        accepted_at = now(),
        reviewed_at = now(),
        reviewed_by = v_uid
    WHERE id = p_member_id
    RETURNING * INTO v_row;
  RETURN v_row;
END $$;
GRANT EXECUTE ON FUNCTION public.approve_tree_access_request(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_tree_access_request(p_member_id uuid, p_reason text DEFAULT NULL)
RETURNS public.tree_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.tree_members%ROWTYPE;
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO v_row FROM public.tree_members WHERE id = p_member_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  SELECT owner_id INTO v_owner FROM public.trees WHERE id = v_row.tree_id;
  IF v_owner <> v_uid THEN RAISE EXCEPTION 'Only tree owner can reject'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'Request is not pending'; END IF;
  UPDATE public.tree_members
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_at = now(),
        reviewed_by = v_uid
    WHERE id = p_member_id
    RETURNING * INTO v_row;
  RETURN v_row;
END $$;
GRANT EXECUTE ON FUNCTION public.reject_tree_access_request(uuid, text) TO authenticated;
