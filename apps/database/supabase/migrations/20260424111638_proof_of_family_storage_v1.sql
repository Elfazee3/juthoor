
-- Private storage bucket for proof-of-family uploads.
-- Path convention: {target_tree_id}/{requester_user_id}/{uuid}.{ext}
INSERT INTO storage.buckets (id, name, public)
  VALUES ('proof-of-family', 'proof-of-family', false)
  ON CONFLICT (id) DO NOTHING;

-- Policies
DROP POLICY IF EXISTS "proof_uploader_insert" ON storage.objects;
CREATE POLICY "proof_uploader_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proof-of-family'
    AND (auth.uid()::text = (storage.foldername(name))[2])
  );

DROP POLICY IF EXISTS "proof_uploader_read_own" ON storage.objects;
CREATE POLICY "proof_uploader_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proof-of-family'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );

DROP POLICY IF EXISTS "proof_tree_owner_reads" ON storage.objects;
CREATE POLICY "proof_tree_owner_reads" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proof-of-family'
    AND EXISTS (
      SELECT 1 FROM public.trees t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "proof_uploader_delete_own" ON storage.objects;
CREATE POLICY "proof_uploader_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'proof-of-family'
    AND auth.uid()::text = (storage.foldername(name))[2]
  );
