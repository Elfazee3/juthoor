-- Nightly matching schedule (requirement R5: matching runs as an end-of-day batch).
--
--   * run_matching_scheduled(p_full) is what the schedule calls. It honours a kill switch
--     (app_settings.nightly_matching_enabled), records a failed run in matching_runs instead of
--     leaving nothing behind, and closes runs that never finished.
--   * pg_cron runs it every night: an incremental run Monday to Saturday and a full run on
--     Sunday, at 23:30 UTC (02:30 or 01:30 in Palestine). Created only where pg_cron is available;
--     elsewhere the migration still succeeds, and the function can be called from any scheduler.
--
-- Running the batch does not link anyone by itself: automatic linking stays off until
-- app_settings.auto_merge_enabled is switched on (a human decision, after checking precision).
-- The batch queues pairs for review as before.

-- ── 1. kill switch ───────────────────────────────────────────────────────────
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS nightly_matching_enabled boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.app_settings.nightly_matching_enabled IS
  'Kill switch for the scheduled matching run (run_matching_scheduled). Independent of auto_merge_enabled, which decides whether the run links pairs.';

-- ── 2. the scheduled entry point ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_matching_scheduled(p_full boolean DEFAULT false)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_enabled boolean;
  v_run uuid;
BEGIN
  SELECT nightly_matching_enabled INTO v_enabled FROM public.app_settings LIMIT 1;
  IF NOT COALESCE(v_enabled, true) THEN
    RETURN NULL;
  END IF;

  -- A run that started long ago and never finished (the server restarted mid-run) is closed.
  UPDATE public.matching_runs
     SET status = 'errored', finished_at = now(), errored = errored + 1,
         notes = coalesce(notes || ' ', '') || 'never finished'
   WHERE status = 'running' AND started_at < now() - interval '6 hours';

  BEGIN
    v_run := public.run_matching_batch(p_full);
  EXCEPTION WHEN OTHERS THEN
    -- The failed batch rolled back, with its own run row. Leave a trace that survives.
    INSERT INTO public.matching_runs(run_type, status, finished_at, errored, notes)
      VALUES (CASE WHEN p_full THEN 'full' ELSE 'incremental' END, 'errored', now(), 1,
              left(SQLERRM, 500));
    RETURN NULL;
  END;
  RETURN v_run;   -- NULL when another run holds the lock
END $$;

REVOKE ALL ON FUNCTION public.run_matching_scheduled(boolean) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.run_matching_scheduled IS
  'Entry point for the nightly schedule: honours app_settings.nightly_matching_enabled, calls run_matching_batch, records a failure in matching_runs. Not callable through the API.';

-- ── 3. the schedule ──────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron is not available (%); schedule run_matching_scheduled() from the server instead', SQLERRM;
    RETURN;
  END;

  -- cron.schedule replaces a job of the same name, so applying the migration twice is harmless.
  PERFORM cron.schedule('juthoor_nightly_match', '30 23 * * 1-6',
                        'SELECT public.run_matching_scheduled(false)');
  PERFORM cron.schedule('juthoor_weekly_full',   '30 23 * * 0',
                        'SELECT public.run_matching_scheduled(true)');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'matching schedule not created (%); schedule run_matching_scheduled() from the server instead', SQLERRM;
END $$;
