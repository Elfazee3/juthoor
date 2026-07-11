-- M2 (B12): run_matching_batch — the shadow-mode orchestrator. Drains the dirty
-- queue → refreshes features → rebuilds block keys → generates candidates →
-- scores each with score_pair → UPSERTs into matches. SHADOW MODE: every match
-- lands as 'pending' (nothing auto-links until precision is proven at M4), and a
-- human decision is never clobbered by a re-run. Advisory-locked single-flight
-- so pg_cron + a Vercel-cron fallback can't double-run.
--
-- NOTE: person_links(proposed) writes and chunked per-tx commits are deferred
-- (person_links table lands in M3; chunking is a scale refinement). This is the
-- correct, demoable shadow batch.

CREATE OR REPLACE FUNCTION public.run_matching_batch(p_full boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_run uuid;
  r record;
  v_score int;
  v_breakdown jsonb;
  v_pairs int := 0;
  v_queued int := 0;
  v_living int := 0;
  v_probed int := 0;
BEGIN
  -- Single-flight: documented advisory lock key. If another batch holds it, bail.
  IF NOT pg_try_advisory_xact_lock(724242) THEN
    RETURN NULL;
  END IF;
  SET LOCAL statement_timeout = 0;

  INSERT INTO public.matching_runs(run_type, status)
    VALUES (CASE WHEN p_full THEN 'full' ELSE 'incremental' END, 'running')
    RETURNING id INTO v_run;

  -- 1. features
  IF p_full THEN
    PERFORM public.refresh_match_features(id) FROM public.persons;
  ELSE
    PERFORM public.refresh_match_features_batch();
  END IF;
  SELECT count(*) INTO v_probed FROM public.match_features;

  -- 2. block keys
  PERFORM public.refresh_match_block_keys(true);

  -- 3 + 4. candidates → score → upsert
  FOR r IN SELECT person_a_id, person_b_id FROM public.generate_match_candidates() LOOP
    SELECT score, breakdown INTO v_score, v_breakdown
      FROM public.score_pair(r.person_a_id, r.person_b_id);
    v_pairs := v_pairs + 1;
    IF v_breakdown -> 'meta' ->> 'privacy' = 'living_suppressed' THEN
      v_living := v_living + 1;
    END IF;

    INSERT INTO public.matches(person_a_id, person_b_id, confidence_score, status, found_by, score_breakdown)
      VALUES (r.person_a_id, r.person_b_id, v_score, 'pending', 'system', v_breakdown)
    ON CONFLICT (person_a_id, person_b_id) DO UPDATE
      SET confidence_score = EXCLUDED.confidence_score,
          score_breakdown  = EXCLUDED.score_breakdown,
          updated_at       = now()
      WHERE public.matches.status = 'pending';   -- never clobber a human decision
    v_queued := v_queued + 1;
  END LOOP;

  UPDATE public.matching_runs
    SET status = 'completed', finished_at = now(),
        persons_probed = v_probed, pairs_compared = v_pairs,
        queued = v_queued, living_suppressed = v_living
    WHERE id = v_run;

  RETURN v_run;
END $$;

COMMENT ON FUNCTION public.run_matching_batch IS
  'Shadow-mode nightly matcher: refresh features → block → generate candidates → score_pair → UPSERT matches as pending (never clobbers human decisions). Advisory-locked single-flight (key 724242).';
