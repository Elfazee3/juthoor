-- M2 (B13): the evaluation harness — how precision gets proven before auto-link
-- is ever enabled (plan §7-M2). Uses the SAME score_pair as the batch so eval
-- and production can never diverge.

CREATE TABLE IF NOT EXISTS public.eval_pairs (
  person_a_id     uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  person_b_id     uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  label           text NOT NULL CHECK (label IN ('match', 'non_match')),
  variant_tags    text[] NOT NULL DEFAULT '{}',
  is_holdout      boolean NOT NULL DEFAULT false,
  is_cross_script boolean NOT NULL DEFAULT false,
  source          text,
  emitting_pass   smallint[],
  notes           text,
  PRIMARY KEY (person_a_id, person_b_id),
  CHECK (person_a_id < person_b_id)
);
ALTER TABLE public.eval_pairs ENABLE ROW LEVEL SECURITY;  -- engine-internal / admin

CREATE TABLE IF NOT EXISTS public.eval_runs (
  id                  uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  engine_version      text NOT NULL,
  ran_at              timestamptz NOT NULL DEFAULT now(),
  threshold           int,
  precision           numeric,
  recall              numeric,
  f1                  numeric,
  cross_script_recall numeric,
  n_pairs             int
);
ALTER TABLE public.eval_runs ENABLE ROW LEVEL SECURITY;

-- ── run_eval: score the gold set, sweep for best F1, record metrics ─────────
CREATE OR REPLACE FUNCTION public.run_eval(p_engine_version text)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, extensions, pg_temp AS $$
DECLARE
  v_run uuid;
  v_best_thresh int := 0;
  v_best_f1 numeric := -1;
  v_prec numeric := 0; v_rec numeric := 0; v_f1 numeric := 0; v_csr numeric := 0;
  v_n int;
  t record;
  tp int; fp int; fn int;
BEGIN
  DROP TABLE IF EXISTS _eval_scored;
  CREATE TEMP TABLE _eval_scored AS
    SELECT ep.label, ep.is_cross_script,
           (SELECT s.score FROM public.score_pair(ep.person_a_id, ep.person_b_id) s) AS score
    FROM public.eval_pairs ep
    WHERE NOT ep.is_holdout;

  SELECT count(*) INTO v_n FROM _eval_scored;

  -- sweep every observed score as a candidate threshold; keep the best-F1 one
  FOR t IN SELECT DISTINCT score AS th FROM _eval_scored WHERE score IS NOT NULL ORDER BY score LOOP
    SELECT count(*) FILTER (WHERE score >= t.th AND label = 'match'),
           count(*) FILTER (WHERE score >= t.th AND label = 'non_match'),
           count(*) FILTER (WHERE score <  t.th AND label = 'match')
      INTO tp, fp, fn FROM _eval_scored;
    v_prec := CASE WHEN tp + fp = 0 THEN 0 ELSE tp::numeric / (tp + fp) END;
    v_rec  := CASE WHEN tp + fn = 0 THEN 0 ELSE tp::numeric / (tp + fn) END;
    v_f1   := CASE WHEN v_prec + v_rec = 0 THEN 0 ELSE 2 * v_prec * v_rec / (v_prec + v_rec) END;
    IF v_f1 > v_best_f1 THEN v_best_f1 := v_f1; v_best_thresh := t.th; END IF;
  END LOOP;

  -- recompute metrics at the chosen threshold, incl. cross-script recall
  SELECT count(*) FILTER (WHERE score >= v_best_thresh AND label = 'match'),
         count(*) FILTER (WHERE score >= v_best_thresh AND label = 'non_match'),
         count(*) FILTER (WHERE score <  v_best_thresh AND label = 'match')
    INTO tp, fp, fn FROM _eval_scored;
  v_prec := CASE WHEN tp + fp = 0 THEN 0 ELSE round(tp::numeric / (tp + fp), 4) END;
  v_rec  := CASE WHEN tp + fn = 0 THEN 0 ELSE round(tp::numeric / (tp + fn), 4) END;
  v_f1   := CASE WHEN v_prec + v_rec = 0 THEN 0 ELSE round(2 * v_prec * v_rec / (v_prec + v_rec), 4) END;

  SELECT CASE WHEN count(*) FILTER (WHERE label = 'match') = 0 THEN NULL
              ELSE round(count(*) FILTER (WHERE label = 'match' AND score >= v_best_thresh)::numeric
                         / count(*) FILTER (WHERE label = 'match'), 4) END
    INTO v_csr FROM _eval_scored WHERE is_cross_script;

  INSERT INTO public.eval_runs(engine_version, threshold, precision, recall, f1, cross_script_recall, n_pairs)
    VALUES (p_engine_version, v_best_thresh, v_prec, v_rec, v_f1, v_csr, v_n)
    RETURNING id INTO v_run;

  DROP TABLE IF EXISTS _eval_scored;
  RETURN v_run;
END $$;

COMMENT ON FUNCTION public.run_eval IS
  'Scores eval_pairs (non-holdout) with score_pair, sweeps thresholds for best F1, records precision/recall/F1 + cross_script_recall into eval_runs. Same scorer as the batch.';
