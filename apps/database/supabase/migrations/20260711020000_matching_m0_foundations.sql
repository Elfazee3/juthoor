-- M0 foundations (matching engine, plan §6/§7-M0): runtime config, batch
-- observability, and owner privacy holds. (is_person_living() shipped in
-- 20260711010000_degrees_masking.sql.)

-- ── app_settings — single-row runtime config (the auto-merge kill switch) ────
CREATE TABLE IF NOT EXISTS public.app_settings (
  id                    boolean PRIMARY KEY DEFAULT true CHECK (id),  -- single-row guard
  auto_merge_enabled    boolean NOT NULL DEFAULT false,               -- SHADOW MODE: off until precision proven
  auto_merge_threshold  integer NOT NULL DEFAULT 450,
  score_pct_floor       numeric NOT NULL DEFAULT 0.78,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins read/write; the nightly batch runs as service_role (bypasses RLS).
DROP POLICY IF EXISTS app_settings_admin_all ON public.app_settings;
CREATE POLICY app_settings_admin_all ON public.app_settings
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.app_settings IS
  'Single-row matching-engine config. auto_merge_enabled is the kill switch — defaults false (shadow mode); flipping it is a human decision after precision is proven.';

-- ── matching_runs — nightly batch observability ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.matching_runs (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  run_type          text NOT NULL DEFAULT 'incremental',  -- 'incremental' | 'full'
  status            text NOT NULL DEFAULT 'running',       -- 'running' | 'completed' | 'errored'
  started_at        timestamptz NOT NULL DEFAULT now(),
  finished_at       timestamptz,
  watermark_from    timestamptz,
  watermark_to      timestamptz,
  persons_probed    integer NOT NULL DEFAULT 0,
  pairs_compared    integer NOT NULL DEFAULT 0,
  auto_linked       integer NOT NULL DEFAULT 0,
  queued            integer NOT NULL DEFAULT 0,
  living_suppressed integer NOT NULL DEFAULT 0,
  errored           integer NOT NULL DEFAULT 0,
  notes             text
);

ALTER TABLE public.matching_runs ENABLE ROW LEVEL SECURITY;

-- Admin-only read; the batch writes as service_role.
DROP POLICY IF EXISTS matching_runs_admin_read ON public.matching_runs;
CREATE POLICY matching_runs_admin_read ON public.matching_runs
  FOR SELECT TO authenticated
  USING (public.is_admin());

COMMENT ON TABLE public.matching_runs IS 'Per-batch observability counters for the nightly matcher.';

-- ── person_privacy_holds — owner "do-not-match" opt-out ─────────────────────
CREATE TABLE IF NOT EXISTS public.person_privacy_holds (
  person_id uuid PRIMARY KEY REFERENCES public.persons(id) ON DELETE CASCADE,
  set_by    uuid REFERENCES auth.users(id),
  set_at    timestamptz NOT NULL DEFAULT now(),
  reason    text
);

ALTER TABLE public.person_privacy_holds ENABLE ROW LEVEL SECURITY;

-- A person's tree owner (write access) manages its hold; admins see all.
DROP POLICY IF EXISTS pph_select ON public.person_privacy_holds;
CREATE POLICY pph_select ON public.person_privacy_holds
  FOR SELECT TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.persons p WHERE p.id = person_id AND public.can_write_tree(p.tree_id)));

DROP POLICY IF EXISTS pph_insert ON public.person_privacy_holds;
CREATE POLICY pph_insert ON public.person_privacy_holds
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.persons p WHERE p.id = person_id AND public.can_write_tree(p.tree_id)));

DROP POLICY IF EXISTS pph_delete ON public.person_privacy_holds;
CREATE POLICY pph_delete ON public.person_privacy_holds
  FOR DELETE TO authenticated
  USING (public.is_admin() OR EXISTS (
    SELECT 1 FROM public.persons p WHERE p.id = person_id AND public.can_write_tree(p.tree_id)));

COMMENT ON TABLE public.person_privacy_holds IS
  'Owner opt-out: a person here is a hard veto for the matcher (never surfaced/compared cross-tree).';
