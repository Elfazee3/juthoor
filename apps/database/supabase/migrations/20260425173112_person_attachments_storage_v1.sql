
-- Private storage bucket for person photos + documents.
-- Path convention: {tree_id}/{person_id}/{uuid}.{ext}
INSERT INTO storage.buckets (id, name, public)
  VALUES ('person-attachments', 'person-attachments', false)
  ON CONFLICT (id) DO NOTHING;

-- Read: anyone who can access the underlying tree
DROP POLICY IF EXISTS "pa_storage_read" ON storage.objects;
CREATE POLICY "pa_storage_read" ON storage.objects
  FOR SELECT TO authenticated, anon
  USING (
    bucket_id = 'person-attachments'
    AND public.can_access_tree(((storage.foldername(storage.objects.name))[1])::uuid)
  );

-- Insert: owner or collaborator on the parent tree
DROP POLICY IF EXISTS "pa_storage_insert" ON storage.objects;
CREATE POLICY "pa_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'person-attachments'
    AND EXISTS (
      SELECT 1 FROM public.trees t
      WHERE t.id::text = (storage.foldername(storage.objects.name))[1]
        AND (
          t.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.tree_members tm
            WHERE tm.tree_id = t.id
              AND tm.user_id = auth.uid()
              AND tm.status = 'approved'
              AND tm.role IN ('owner','collaborator')
          )
        )
    )
  );

-- Delete: owner of the tree (uploader-delete is enforced via DB row delete CASCADE-ish path)
DROP POLICY IF EXISTS "pa_storage_delete" ON storage.objects;
CREATE POLICY "pa_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'person-attachments'
    AND EXISTS (
      SELECT 1 FROM public.trees t
      WHERE t.id::text = (storage.foldername(storage.objects.name))[1]
        AND t.owner_id = auth.uid()
    )
  );
