-- M2 (B11): blocking — turn O(n²) into a near-linear candidate pass.
-- Block keys are derived from the script-folded match_features (so passes are
-- cross-script by construction). generate_match_candidates emits DISTINCT
-- cross-tree a<b pairs, skew-capped, privacy-hold-excluded, and anti-joined
-- against already-decided matches.

CREATE TABLE IF NOT EXISTS public.match_block_keys (
  person_id   uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  pass        smallint NOT NULL,
  block_key   text NOT NULL,
  tree_id     uuid NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (person_id, pass, block_key)
);
CREATE INDEX IF NOT EXISTS idx_mbk_collision ON public.match_block_keys (pass, block_key, tree_id, person_id);
ALTER TABLE public.match_block_keys ENABLE ROW LEVEL SECURITY;  -- engine-internal, deny-all

CREATE TABLE IF NOT EXISTS public.match_block_skips (
  pass        smallint NOT NULL,
  block_key   text NOT NULL,
  member_count int NOT NULL,
  skipped_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.match_block_skips ENABLE ROW LEVEL SECURITY;

-- ── rebuild the block keys from match_features (7 passes; cross-script inherent) ─
CREATE OR REPLACE FUNCTION public.refresh_match_block_keys(p_full boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_full THEN TRUNCATE public.match_block_keys; END IF;

  -- pass 1: phonetic given + surname (cross-script — features are script-folded)
  INSERT INTO public.match_block_keys(person_id, pass, block_key, tree_id)
    SELECT person_id, 1, given_phon || '|' || surname_phon, tree_id FROM public.match_features
    WHERE given_phon <> '' AND surname_phon <> '' AND NOT privacy_hold
    ON CONFLICT DO NOTHING;
  -- pass 2: phonetic surname + birth-decade
  INSERT INTO public.match_block_keys(person_id, pass, block_key, tree_id)
    SELECT person_id, 2, surname_phon || '|' || (birth_year/10)::text, tree_id FROM public.match_features
    WHERE surname_phon <> '' AND birth_year IS NOT NULL AND NOT privacy_hold
    ON CONFLICT DO NOTHING;
  -- pass 3: phonetic given + origin place
  INSERT INTO public.match_block_keys(person_id, pass, block_key, tree_id)
    SELECT person_id, 3, given_phon || '|' || origin_place_id::text, tree_id FROM public.match_features
    WHERE given_phon <> '' AND origin_place_id IS NOT NULL AND NOT privacy_hold
    ON CONFLICT DO NOTHING;
  -- pass 4: phonetic father + origin place
  INSERT INTO public.match_block_keys(person_id, pass, block_key, tree_id)
    SELECT person_id, 4, father_phon || '|' || origin_place_id::text, tree_id FROM public.match_features
    WHERE father_phon <> '' AND origin_place_id IS NOT NULL AND NOT privacy_hold
    ON CONFLICT DO NOTHING;
  -- pass 5: origin place + birth-decade (non-name anchor — mangled given still caught)
  INSERT INTO public.match_block_keys(person_id, pass, block_key, tree_id)
    SELECT person_id, 5, origin_place_id::text || '|' || (birth_year/10)::text, tree_id FROM public.match_features
    WHERE origin_place_id IS NOT NULL AND birth_year IS NOT NULL AND NOT privacy_hold
    ON CONFLICT DO NOTHING;
  -- pass 6: phonetic father + paternal grandfather (patriline anchor)
  INSERT INTO public.match_block_keys(person_id, pass, block_key, tree_id)
    SELECT person_id, 6, father_phon || '|' || pgf_phon, tree_id FROM public.match_features
    WHERE father_phon <> '' AND pgf_phon <> '' AND NOT privacy_hold
    ON CONFLICT DO NOTHING;
END $$;

-- ── emit candidate pairs ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_match_candidates(p_max_block_size int DEFAULT 1000)
RETURNS TABLE(person_a_id uuid, person_b_id uuid)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$  -- writes match_block_skips
BEGIN
  -- audit + skip skewed blocks (recorded so recall loss is visible)
  DELETE FROM public.match_block_skips;
  INSERT INTO public.match_block_skips(pass, block_key, member_count)
    SELECT pass, block_key, count(*) FROM public.match_block_keys
    GROUP BY pass, block_key HAVING count(*) > p_max_block_size;

  RETURN QUERY
  SELECT DISTINCT k1.person_id, k2.person_id
  FROM public.match_block_keys k1
  JOIN public.match_block_keys k2
    ON k1.pass = k2.pass AND k1.block_key = k2.block_key AND k1.person_id < k2.person_id
  WHERE k1.tree_id <> k2.tree_id
    AND NOT EXISTS (SELECT 1 FROM public.match_block_skips s WHERE s.pass = k1.pass AND s.block_key = k1.block_key)
    AND NOT EXISTS (SELECT 1 FROM public.matches m WHERE m.person_a_id = k1.person_id AND m.person_b_id = k2.person_id);
END $$;

COMMENT ON FUNCTION public.generate_match_candidates IS
  'Emits DISTINCT cross-tree a<b candidate pairs from block-key collisions; skew-capped (logged to match_block_skips), anti-joined against decided matches. privacy_hold persons are excluded at block-key build time.';
