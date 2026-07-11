-- M3 (B14): review surfaces, notifications & the Mother Tree overlay (plan §6/§7-M3).
--
-- This lays the M3 substrate the review RPCs (B15) transition and the owner/admin
-- UIs (B16–B18) read:
--   • person_links / merge_log — the reversible identity edge + append-only undo log
--     (B12 deferred these here; they are the graph the overlay is built from).
--   • match_audit / notifications / contact_relay / match_hints — review log, in-app
--     feed, anonymity relay, and the owner-facing MASKED accept/reject queue.
--   • match_review_cards — the ONLY owner-facing read path onto a match. The base
--     matches table is admin-only (M0/B2); an owner never reads it. Realized as a
--     SECURITY DEFINER + security_barrier view with an internal auth.uid() ownership
--     predicate (the plan's "security_invoker=on" wording is incompatible with the
--     admin-only base RLS it also mandates — a security_invoker view would hit
--     matches_select_admin_only and return 0 rows to owners; DEFINER + barrier +
--     self-filter is the correct realization of "owners read only via the masked view").
--   • person_identity_groups — the union-find matview over CONFIRMED person_links.
--     This IS the Mother Tree overlay. UNIQUE(person_id) index ships with it so the
--     batch/revoke can REFRESH … CONCURRENTLY.
--   • v_match_explanations — score_breakdown flattened to human sentences for the
--     admin report; admin-only and deceased-public-only (suppressed for living).
--
-- Privacy invariants (plan §4/§5): counterparty detail (initials/district/decade) is
-- shown ONLY for deceased public persons AND withheld whenever EITHER side is living;
-- otherwise a fully redacted "فردٌ محجوب / Hidden relative" token. score_breakdown is
-- reduced to per-field agree/disagree/missing booleans — no raw weights, no
-- counterparty values — and suppressed entirely when a living person is involved.

-- ── enums ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.link_status AS ENUM ('proposed','confirmed','rejected','revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.hint_status AS ENUM ('pending','accepted','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── person_links — the reversible identity edge (Mother Tree) ─────────────────
CREATE TABLE IF NOT EXISTS public.person_links (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  person_a_id      uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  person_b_id      uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  link_type        text NOT NULL DEFAULT 'same_as',
  status           public.link_status NOT NULL DEFAULT 'proposed',
  source_match_id  uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  confidence_score integer,
  source           text,                         -- 'system' | 'admin' | 'owner_pair'
  reviewed_by      uuid REFERENCES auth.users(id),
  reviewed_at      timestamptz,
  score_breakdown  jsonb,                         -- state-only (no raw a/b PII)
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_links_ordered CHECK (person_a_id < person_b_id),
  UNIQUE (person_a_id, person_b_id)
);
CREATE INDEX IF NOT EXISTS idx_person_links_status ON public.person_links (status);
CREATE INDEX IF NOT EXISTS idx_person_links_a ON public.person_links (person_a_id);
CREATE INDEX IF NOT EXISTS idx_person_links_b ON public.person_links (person_b_id);
CREATE INDEX IF NOT EXISTS idx_person_links_match ON public.person_links (source_match_id);

ALTER TABLE public.person_links ENABLE ROW LEVEL SECURITY;
-- Engine-internal linkage graph: admin-only read. Owners see their connections via
-- the masked match_review_cards / match_hints, never this table. Writes go through
-- the SECURITY DEFINER link RPCs (B15) / service-role batch.
DROP POLICY IF EXISTS person_links_admin_read ON public.person_links;
CREATE POLICY person_links_admin_read ON public.person_links
  FOR SELECT TO authenticated USING (public.is_admin());

COMMENT ON TABLE public.person_links IS
  'Reversible identity edge (same_as). status proposed→confirmed/rejected/revoked. Admin-only read; the overlay + degrees hop read confirmed edges via SECURITY DEFINER paths.';

-- ── merge_log — append-only audit / undo ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.merge_log (
  id              uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  action          text NOT NULL CHECK (action IN ('link','confirm','reject','revoke','merge','unmerge')),
  person_link_id  uuid REFERENCES public.person_links(id) ON DELETE SET NULL,
  match_id        uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  actor_user_id   uuid REFERENCES auth.users(id),
  actor_role      text,
  before_state    jsonb,
  after_state     jsonb,
  idempotency_key text UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.merge_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS merge_log_admin_read ON public.merge_log;
CREATE POLICY merge_log_admin_read ON public.merge_log
  FOR SELECT TO authenticated USING (public.is_admin());
COMMENT ON TABLE public.merge_log IS 'Append-only audit/undo for link lifecycle. Admin-only read; written by the link RPCs.';

-- ── match_audit — immutable review-decision log ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.match_audit (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  match_id          uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  actor_user_id     uuid REFERENCES auth.users(id),
  actor_role        text,
  decision          text,
  previous_status   public.match_status,
  new_status        public.match_status,
  note              text,
  score_at_decision integer,
  blocking_pass     smallint,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_match_audit_match ON public.match_audit (match_id, created_at DESC);
ALTER TABLE public.match_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS match_audit_admin_read ON public.match_audit;
CREATE POLICY match_audit_admin_read ON public.match_audit
  FOR SELECT TO authenticated USING (public.is_admin());
COMMENT ON TABLE public.match_audit IS 'Immutable review-decision log. Admin-only read; appended by the status-transition trigger + resolve RPCs (SECURITY DEFINER).';

-- AFTER UPDATE on matches → log status transitions (plan §6 triggers). SECURITY
-- DEFINER so it can write match_audit under its admin-only RLS. Only logs when the
-- status actually changes, so the nightly batch's pending re-UPSERTs never spam it.
CREATE OR REPLACE FUNCTION public.log_match_status_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.match_audit(match_id, actor_user_id, actor_role, decision,
      previous_status, new_status, note, score_at_decision)
    VALUES (NEW.id, auth.uid(),
      CASE WHEN public.is_admin() THEN 'admin' ELSE 'system' END,
      NEW.status::text, OLD.status, NEW.status, NEW.notes, NEW.confidence_score);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_match_status_audit ON public.matches;
CREATE TRIGGER trg_match_status_audit
  AFTER UPDATE OF status ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.log_match_status_transition();

-- ── notifications — in-app feed to owners (NO email in v1, decision #6) ───────
CREATE TABLE IF NOT EXISTS public.notifications (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind              text NOT NULL,
  match_id          uuid REFERENCES public.matches(id) ON DELETE CASCADE,
  person_link_id    uuid REFERENCES public.person_links(id) ON DELETE CASCADE,
  title_ar          text,
  title_en          text,
  body_ar           text,
  body_en           text,
  link              text,
  read_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON public.notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications (recipient_user_id) WHERE read_at IS NULL;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Recipient reads own; recipient marks own read. Inserts are via SECURITY DEFINER
-- RPCs (a user cannot fabricate notifications for someone else).
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated USING (recipient_user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid()) WITH CHECK (recipient_user_id = auth.uid());
COMMENT ON TABLE public.notifications IS 'In-app owner feed (no email v1). Recipient reads/marks-read own; inserted by definer RPCs.';

-- ── contact_relay — revocable, rate-limited anonymity relay ──────────────────
-- Stores only user ids + an opaque token + expiry; NEVER an email address. Either
-- side can be reached via the relay deep link without learning the other's address.
CREATE TABLE IF NOT EXISTS public.contact_relay (
  id           uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  match_id     uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token        uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);
CREATE INDEX IF NOT EXISTS idx_contact_relay_parties
  ON public.contact_relay (from_user_id, to_user_id);
ALTER TABLE public.contact_relay ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS contact_relay_participant ON public.contact_relay;
CREATE POLICY contact_relay_participant ON public.contact_relay
  FOR SELECT TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid() OR public.is_admin());
COMMENT ON TABLE public.contact_relay IS 'Anonymity relay tokens (no email at rest, revocable). Participants read own; issued/revoked by definer RPCs.';

-- ── match_hints — owner-facing MASKED accept/reject queue ────────────────────
CREATE TABLE IF NOT EXISTS public.match_hints (
  id                    uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  match_id              uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  owner_user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  counterpart_person_id uuid NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  status                public.hint_status NOT NULL DEFAULT 'pending',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, owner_user_id)
);
CREATE INDEX IF NOT EXISTS idx_match_hints_owner
  ON public.match_hints (owner_user_id, status);
ALTER TABLE public.match_hints ENABLE ROW LEVEL SECURITY;
-- Owner reads own hints; status flips go through resolve_match_hint (B15) so every
-- decision is audited + notified — hence no direct UPDATE policy here.
DROP POLICY IF EXISTS match_hints_owner_read ON public.match_hints;
CREATE POLICY match_hints_owner_read ON public.match_hints
  FOR SELECT TO authenticated USING (owner_user_id = auth.uid() OR public.is_admin());
COMMENT ON TABLE public.match_hints IS 'Owner-facing masked accept/reject queue (the "defer band"). Owner reads own; flips via resolve_match_hint RPC.';

-- ── field-agreement reducer — score_breakdown → agree/disagree/missing ───────
-- Reduces the persisted params block to a per-field verdict with NO weights and NO
-- counterparty values. "disagree" comes from the meta.vetoes markers; a zero-points
-- field with no disagreement marker is "missing".
CREATE OR REPLACE FUNCTION public.match_field_agreement(p_breakdown jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT COALESCE(jsonb_object_agg(k, verdict), '{}'::jsonb)
  FROM (
    SELECT e.key AS k,
      CASE
        WHEN COALESCE((e.value->>'pts')::int, 0) > 0 THEN 'agree'
        WHEN COALESCE(p_breakdown->'meta'->'vetoes','[]'::jsonb) ? (
          CASE e.key
            WHEN 'mother'     THEN 'mother_disagree'
            WHEN 'spouse'     THEN 'spouse_disagree'
            WHEN 'origin'     THEN 'origin_disagree'
            WHEN 'mgf'        THEN 'mgp_disagree'
            WHEN 'mgm'        THEN 'mgp_disagree'
            WHEN 'birth_year' THEN 'birth_year_disagree'
            ELSE '__none__'
          END) THEN 'disagree'
        WHEN e.key = 'birth_year'
          AND COALESCE(p_breakdown->'meta'->'vetoes','[]'::jsonb) ? 'birth_year_gap' THEN 'disagree'
        ELSE 'missing'
      END AS verdict
    FROM jsonb_each(COALESCE(p_breakdown->'params','{}'::jsonb)) AS e
  ) t;
$$;
COMMENT ON FUNCTION public.match_field_agreement IS
  'Reduces a persisted score_breakdown to {field: agree|disagree|missing} — no weights, no counterparty values (plan §4/§5 threat #6).';

-- ── match_review_cards — the ONLY owner-facing read onto a match (masked) ────
-- SECURITY DEFINER + security_barrier: runs as owner (bypasses the admin-only
-- matches RLS) but self-restricts to rows the caller owns (can_write_tree) or admin.
-- Two perspective rows per match so each owner sees their own side in full and the
-- counterparty masked; an admin sees both perspectives.
CREATE OR REPLACE VIEW public.match_review_cards
WITH (security_invoker = false, security_barrier = true) AS
WITH perspectives AS (
  SELECT m.id AS match_id, m.confidence_score, m.status, m.score_breakdown,
         m.created_at, m.updated_at,
         m.person_a_id AS viewer_person_id, m.person_b_id AS counterpart_person_id
  FROM public.matches m
  UNION ALL
  SELECT m.id, m.confidence_score, m.status, m.score_breakdown,
         m.created_at, m.updated_at,
         m.person_b_id, m.person_a_id
  FROM public.matches m
),
base AS (
  SELECT p.*,
         vp.tree_id AS viewer_tree_id,
         vp.display_name_ar AS viewer_name_ar,
         vp.display_name_en AS viewer_name_en,
         cp.display_name_ar AS cp_name_ar,
         cp.display_name_en AS cp_name_en,
         ct.is_public       AS cp_tree_public,
         public.is_person_living(p.viewer_person_id)     AS viewer_living,
         public.is_person_living(p.counterpart_person_id) AS cp_living,
         cf.birth_year      AS cp_birth_year,
         cpl.name_ar        AS cp_place_ar,
         cpl.name_en        AS cp_place_en
  FROM perspectives p
  JOIN public.persons vp ON vp.id = p.viewer_person_id
  JOIN public.persons cp ON cp.id = p.counterpart_person_id
  JOIN public.trees   vt ON vt.id = vp.tree_id
  JOIN public.trees   ct ON ct.id = cp.tree_id
  LEFT JOIN public.match_features cf ON cf.person_id = p.counterpart_person_id
  LEFT JOIN public.places cpl ON cpl.id = COALESCE(cf.origin_place_id, cf.birth_place_id)
  WHERE public.is_admin() OR public.can_write_tree(vt.id)
)
SELECT
  b.match_id, b.confidence_score, b.status, b.created_at, b.updated_at,
  b.viewer_person_id, b.viewer_name_ar, b.viewer_name_en,
  b.counterpart_person_id,
  b.cp_living AS counterpart_is_living,
  (b.viewer_living OR b.cp_living) AS living_involved,
  -- reveal counterparty detail only for a deceased public person AND only when
  -- neither side is living.
  (NOT b.cp_living AND b.cp_tree_public AND NOT b.viewer_living) AS counterpart_revealed,
  CASE WHEN (NOT b.cp_living AND b.cp_tree_public AND NOT b.viewer_living)
       THEN FALSE ELSE TRUE END AS counterpart_masked,
  CASE WHEN (NOT b.cp_living AND b.cp_tree_public AND NOT b.viewer_living)
       THEN left(COALESCE(b.cp_name_en, b.cp_name_ar, '?'), 1) || '.' END AS counterpart_initials,
  CASE WHEN (NOT b.cp_living AND b.cp_tree_public AND NOT b.viewer_living)
       THEN b.cp_place_ar END AS counterpart_district_ar,
  CASE WHEN (NOT b.cp_living AND b.cp_tree_public AND NOT b.viewer_living)
       THEN b.cp_place_en END AS counterpart_district_en,
  CASE WHEN (NOT b.cp_living AND b.cp_tree_public AND NOT b.viewer_living) AND b.cp_birth_year IS NOT NULL
       THEN (b.cp_birth_year / 10) * 10 END AS counterpart_decade,
  CASE WHEN (NOT b.cp_living AND b.cp_tree_public AND NOT b.viewer_living)
       THEN left(COALESCE(b.cp_name_en, b.cp_name_ar, '?'), 1) || '. '
            || COALESCE(b.cp_place_ar, '')
            || COALESCE(' — ' || ((b.cp_birth_year / 10) * 10)::text || 's', '')
       ELSE 'فردٌ محجوب' END AS counterpart_label_ar,
  CASE WHEN (NOT b.cp_living AND b.cp_tree_public AND NOT b.viewer_living)
       THEN left(COALESCE(b.cp_name_en, b.cp_name_ar, '?'), 1) || '. '
            || COALESCE(b.cp_place_en, b.cp_place_ar, '')
            || COALESCE(' — ' || ((b.cp_birth_year / 10) * 10)::text || 's', '')
       ELSE 'Hidden relative' END AS counterpart_label_en,
  -- field agreement suppressed entirely when a living person is involved.
  CASE WHEN (b.viewer_living OR b.cp_living) THEN NULL
       ELSE public.match_field_agreement(b.score_breakdown) END AS field_agreement
FROM base b;

GRANT SELECT ON public.match_review_cards TO authenticated;
COMMENT ON VIEW public.match_review_cards IS
  'Owner/admin masked review card — the ONLY owner read onto a match. DEFINER+barrier, self-filtered to can_write_tree/admin; counterparty detail only for deceased-public and only when neither side living; field agreement suppressed for living-involved.';

-- ── person_identity_groups — union-find over CONFIRMED links (the overlay) ───
-- Transitive closure over the (small) confirmed-links graph; canonical = MIN id in
-- the component. Engine-internal (no authenticated grant — the linkage graph is
-- sensitive, plan §5 threat #6); the degrees hop / admin surfaces read it via
-- SECURITY DEFINER paths. UNIQUE(person_id) enables REFRESH … CONCURRENTLY.
CREATE MATERIALIZED VIEW IF NOT EXISTS public.person_identity_groups AS
WITH RECURSIVE edges AS (
  SELECT person_a_id AS a, person_b_id AS b FROM public.person_links WHERE status = 'confirmed'
  UNION
  SELECT person_b_id AS a, person_a_id AS b FROM public.person_links WHERE status = 'confirmed'
),
closure(node, reach) AS (
  SELECT a, a FROM edges
  UNION
  SELECT c.node, e.b FROM closure c JOIN edges e ON e.a = c.reach
)
-- canonical = smallest id in the component. uuid has no min() aggregate, so take
-- the first element of an ordered array_agg (uuid IS orderable).
SELECT g.person_id, g.canonical_person_id, g.canonical_person_id AS group_id
FROM (
  SELECT node AS person_id, (array_agg(reach ORDER BY reach))[1] AS canonical_person_id
  FROM closure
  GROUP BY node
) g;

CREATE UNIQUE INDEX IF NOT EXISTS person_identity_groups_pk
  ON public.person_identity_groups (person_id);
CREATE INDEX IF NOT EXISTS idx_person_identity_groups_canon
  ON public.person_identity_groups (canonical_person_id);

REVOKE ALL ON public.person_identity_groups FROM PUBLIC;
COMMENT ON MATERIALIZED VIEW public.person_identity_groups IS
  'Mother Tree overlay: union-find over CONFIRMED person_links → (person_id, canonical_person_id, group_id). Engine-internal; refreshed CONCURRENTLY by batch/revoke.';

-- Refresh helper: CONCURRENTLY for batch/revoke (must run OUTSIDE a txn); plain for
-- tests. SECURITY DEFINER to own the matview refresh regardless of caller role.
CREATE OR REPLACE FUNCTION public.refresh_person_identity_groups(p_concurrent boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_concurrent THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.person_identity_groups;
  ELSE
    REFRESH MATERIALIZED VIEW public.person_identity_groups;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.refresh_person_identity_groups(boolean) FROM PUBLIC;
COMMENT ON FUNCTION public.refresh_person_identity_groups IS
  'Rebuild the Mother Tree overlay. p_concurrent=true (default, non-blocking, OUTSIDE a txn) for batch/revoke; false for tests inside a txn.';

-- ── v_match_explanations — flattened human sentences (admin report only) ─────
-- Admin-only and deceased-public-only (suppressed when either side living). One row
-- per agreeing field with a bilingual sentence for the admin review report.
CREATE OR REPLACE VIEW public.v_match_explanations
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  m.id AS match_id,
  e.key AS field,
  (e.value->>'pts')::int AS pts,
  (e.value->>'w')::int   AS weight,
  CASE e.key
    WHEN 'given'       THEN 'الاسم الأول متطابق'
    WHEN 'surname'     THEN 'اسم العائلة متطابق'
    WHEN 'father'      THEN 'اسم الأب متطابق'
    WHEN 'mother'      THEN 'اسم الأم متطابق'
    WHEN 'pgf'         THEN 'الجد لأب متطابق'
    WHEN 'pgm'         THEN 'الجدة لأب متطابقة'
    WHEN 'mgf'         THEN 'الجد لأم متطابق'
    WHEN 'mgm'         THEN 'الجدة لأم متطابقة'
    WHEN 'spouse'      THEN 'اسم الزوج/الزوجة متطابق'
    WHEN 'origin'      THEN 'بلدة الأصل متطابقة'
    WHEN 'birth_year'  THEN 'سنة الميلاد متقاربة'
    WHEN 'birth_place' THEN 'مكان الميلاد متطابق'
    WHEN 'death_year'  THEN 'سنة الوفاة متقاربة'
    WHEN 'death_place' THEN 'مكان الوفاة متطابق'
    WHEN 'email'       THEN 'البريد الإلكتروني متطابق'
    WHEN 'num_children' THEN 'عدد الأبناء متقارب'
    ELSE e.key
  END AS sentence_ar,
  CASE e.key
    WHEN 'given'       THEN 'Given name agrees'
    WHEN 'surname'     THEN 'Surname agrees'
    WHEN 'father'      THEN 'Father''s name agrees'
    WHEN 'mother'      THEN 'Mother''s name agrees'
    WHEN 'pgf'         THEN 'Paternal grandfather agrees'
    WHEN 'pgm'         THEN 'Paternal grandmother agrees'
    WHEN 'mgf'         THEN 'Maternal grandfather agrees'
    WHEN 'mgm'         THEN 'Maternal grandmother agrees'
    WHEN 'spouse'      THEN 'Spouse name agrees'
    WHEN 'origin'      THEN 'Town of origin agrees'
    WHEN 'birth_year'  THEN 'Birth year is close'
    WHEN 'birth_place' THEN 'Birthplace agrees'
    WHEN 'death_year'  THEN 'Death year is close'
    WHEN 'death_place' THEN 'Place of death agrees'
    WHEN 'email'       THEN 'Email matches'
    WHEN 'num_children' THEN 'Similar number of children'
    ELSE e.key
  END AS sentence_en
FROM public.matches m
CROSS JOIN LATERAL jsonb_each(COALESCE(m.score_breakdown->'params','{}'::jsonb)) AS e
WHERE public.is_admin()
  AND NOT public.is_person_living(m.person_a_id)
  AND NOT public.is_person_living(m.person_b_id)
  AND COALESCE((e.value->>'pts')::int, 0) > 0;

GRANT SELECT ON public.v_match_explanations TO authenticated;
COMMENT ON VIEW public.v_match_explanations IS
  'Admin-only, deceased-public-only flattening of score_breakdown into bilingual agreeing-field sentences for the review report (suppressed when either side living).';
