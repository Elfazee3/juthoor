
-- Cache of computed BFS paths between two persons. Key is the pair (unordered
-- via sort), so compute_degrees(A,B) and compute_degrees(B,A) share a row.
CREATE TABLE IF NOT EXISTS public.match_paths (
  source_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  target_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  degrees          smallint NOT NULL,
  path_json        jsonb NOT NULL,
  computed_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_person_id, target_person_id),
  CHECK (source_person_id < target_person_id)   -- canonical ordering
);

CREATE INDEX IF NOT EXISTS idx_match_paths_computed_at ON public.match_paths (computed_at);

ALTER TABLE public.match_paths ENABLE ROW LEVEL SECURITY;

-- Readable if caller can access BOTH trees (RLS on persons.tree_id handles it).
DROP POLICY IF EXISTS match_paths_readable ON public.match_paths;
CREATE POLICY match_paths_readable ON public.match_paths
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.persons p WHERE p.id = source_person_id)
    AND EXISTS (SELECT 1 FROM public.persons p WHERE p.id = target_person_id)
  );

-- Insert/update policies — only the RPC writes (SECURITY DEFINER handles that path)
DROP POLICY IF EXISTS match_paths_service_write ON public.match_paths;
CREATE POLICY match_paths_service_write ON public.match_paths
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.match_paths IS 'Cached degrees-of-separation BFS paths; 24h TTL enforced via scheduled cleanup.';
