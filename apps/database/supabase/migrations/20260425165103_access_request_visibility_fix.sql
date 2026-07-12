
-- Fix #1: storage policy was referencing trees.name (text column) instead of
-- storage.objects.name (the file path) due to PG resolving the unqualified
-- `name` column to the inner subquery's table. Recreate with a fully-qualified
-- reference using a CTE so there's no ambiguity.
DROP POLICY IF EXISTS "proof_tree_owner_reads" ON storage.objects;
CREATE POLICY "proof_tree_owner_reads" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proof-of-family'
    AND EXISTS (
      SELECT 1 FROM public.trees t
      WHERE t.id::text = (storage.foldername(storage.objects.name))[1]
        AND t.owner_id = auth.uid()
    )
  );

-- Fix #2: tree owners need to read the display_name of users who have
-- requested access to their trees (so the inbox shows "ليلى خوري" not
-- "Unknown user"). Add a SELECT policy on profiles allowing this.
CREATE POLICY profiles_visible_to_target_tree_owner ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tree_members tm
      JOIN public.trees t ON t.id = tm.tree_id
      WHERE tm.user_id = profiles.id
        AND t.owner_id = auth.uid()
    )
  );

-- Sanity check: simulate owner reading the stranger's profile + a proof file
COMMENT ON POLICY profiles_visible_to_target_tree_owner ON public.profiles IS
  'Allows a tree owner to read the display_name of any user who has submitted an access request (or is an approved member) of one of their trees. Required for /dashboard/requests inbox to render the requester name.';
