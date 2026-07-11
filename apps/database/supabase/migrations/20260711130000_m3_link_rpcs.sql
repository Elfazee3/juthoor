-- M3 (B15): the review/link lifecycle RPCs (plan §6 RPCs, §5.2/5.3 consent model).
--
--   resolve_match(match, decision, note)  — admin approve/reject/defer a match.
--   resolve_match_hint(hint, accept)       — an owner accepts/declines their side.
--   confirm/reject/revoke_person_link(id)  — finalize/undo the same_as edge.
--
-- Consent rules baked in (non-negotiable, plan §5.2/5.3):
--   • both-living  → admin-only: NO owner notify, NO hint, link stays 'proposed'.
--   • one-living   → owner-facing but ZERO detail; requires DUAL-OWNER confirmation
--                    (a living person never fuses on admin authority alone).
--   • both-deceased→ an admin may fuse directly (decision #5); owners notified.
--   • a decline is never revealed to the counterpart (§5.3).
--   • revoke is transactionally complete: retract notifications, expire relay
--     tokens, invalidate cached degree paths, and QUEUE (not sync-run) the overlay
--     refresh (§6 — a full matview rebuild never blocks an admin request).
--
-- Every function is SECURITY DEFINER + SET search_path='' and self-authorizes.

-- ── deferred overlay-refresh queue (never REFRESH inside a request txn) ───────
CREATE TABLE IF NOT EXISTS public.overlay_refresh_queue (
  id             uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  reason         text,
  person_link_id uuid,
  requested_at   timestamptz NOT NULL DEFAULT now(),
  processed_at   timestamptz
);
ALTER TABLE public.overlay_refresh_queue ENABLE ROW LEVEL SECURITY;  -- engine-internal, deny-all
COMMENT ON TABLE public.overlay_refresh_queue IS
  'Deferred Mother Tree overlay refresh requests. Drained by the batch/cron (drain_overlay_refresh) — never refreshed synchronously in an admin request path.';

CREATE OR REPLACE FUNCTION public.enqueue_overlay_refresh(p_reason text, p_link uuid DEFAULT NULL)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  INSERT INTO public.overlay_refresh_queue(reason, person_link_id) VALUES (p_reason, p_link);
$$;

-- Drained OUTSIDE a txn by the batch/cron: refresh CONCURRENTLY if anything pending.
CREATE OR REPLACE FUNCTION public.drain_overlay_refresh()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM public.overlay_refresh_queue WHERE processed_at IS NULL;
  IF v_n > 0 THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.person_identity_groups;
    UPDATE public.overlay_refresh_queue SET processed_at = now() WHERE processed_at IS NULL;
  END IF;
  RETURN v_n;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_overlay_refresh(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.drain_overlay_refresh() FROM PUBLIC;

-- ── internal helpers ─────────────────────────────────────────────────────────
-- tree owner of a person (SECURITY DEFINER so it sees across trees).
CREATE OR REPLACE FUNCTION public.match_person_owner(p_person uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT t.owner_id FROM public.persons p JOIN public.trees t ON t.id = p.tree_id WHERE p.id = p_person;
$$;
REVOKE ALL ON FUNCTION public.match_person_owner(uuid) FROM PUBLIC;

-- a match's living posture, computed fail-toward-living.
CREATE OR REPLACE FUNCTION public.match_living_flags(p_match uuid)
RETURNS TABLE(one_living boolean, both_living boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.is_person_living(m.person_a_id) OR public.is_person_living(m.person_b_id),
         public.is_person_living(m.person_a_id) AND public.is_person_living(m.person_b_id)
  FROM public.matches m WHERE m.id = p_match;
$$;
REVOKE ALL ON FUNCTION public.match_living_flags(uuid) FROM PUBLIC;

-- one owner notification, ZERO detail when a living person is involved (§5.2).
CREATE OR REPLACE FUNCTION public.create_match_notification(
  p_recipient uuid, p_kind text, p_match uuid, p_link uuid, p_living boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_recipient IS NULL THEN RETURN; END IF;
  IF p_living THEN
    -- zero identifying detail; no deep link that could confirm an identity.
    INSERT INTO public.notifications(recipient_user_id, kind, match_id, person_link_id,
      title_ar, title_en, body_ar, body_en, link)
    VALUES (p_recipient, p_kind, p_match, p_link,
      'اتصال محتمل قيد المراجعة', 'A possible connection is under review',
      'لا حاجة لأي إجراء.', 'No action needed.', NULL);
  ELSIF p_kind = 'connection_confirmed' THEN
    INSERT INTO public.notifications(recipient_user_id, kind, match_id, person_link_id,
      title_ar, title_en, body_ar, body_en, link)
    VALUES (p_recipient, p_kind, p_match, p_link,
      'تم تأكيد الاتصال', 'Connection confirmed',
      'تم تأكيد اتصال عائلي جديد.', 'A new family connection was confirmed.', '/dashboard/connections');
  ELSE
    INSERT INTO public.notifications(recipient_user_id, kind, match_id, person_link_id,
      title_ar, title_en, body_ar, body_en, link)
    VALUES (p_recipient, p_kind, p_match, p_link,
      'اتصال عائلي محتمل جديد', 'New possible family connection',
      'لديك اتصال محتمل للمراجعة.', 'You have a possible connection to review.', '/dashboard/connections');
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.create_match_notification(uuid, text, uuid, uuid, boolean) FROM PUBLIC;

-- ── resolve_match — admin decision on a match ────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_match(p_match_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  m public.matches%ROWTYPE;
  v_one boolean; v_both boolean;
  v_owner_a uuid; v_owner_b uuid;
  v_link uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  IF p_decision NOT IN ('approve','reject','defer') THEN
    RAISE EXCEPTION 'invalid_decision:%', p_decision USING ERRCODE = '22023';
  END IF;

  SELECT * INTO m FROM public.matches WHERE id = p_match_id;
  IF m.id IS NULL THEN RAISE EXCEPTION 'match_not_found' USING ERRCODE = 'P0002'; END IF;

  SELECT one_living, both_living INTO v_one, v_both FROM public.match_living_flags(p_match_id);
  v_owner_a := public.match_person_owner(m.person_a_id);
  v_owner_b := public.match_person_owner(m.person_b_id);

  IF p_decision = 'reject' THEN
    -- note first so the AFTER UPDATE OF status trigger captures it in match_audit.
    UPDATE public.matches SET notes = p_note WHERE id = p_match_id;
    UPDATE public.matches SET status = 'admin_rejected', reviewed_by = auth.uid(), reviewed_at = now()
      WHERE id = p_match_id;
    UPDATE public.person_links SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
      WHERE person_a_id = m.person_a_id AND person_b_id = m.person_b_id AND status = 'proposed';
    RETURN;
  END IF;

  IF p_decision = 'defer' THEN
    UPDATE public.matches SET notes = p_note WHERE id = p_match_id;
    UPDATE public.matches SET status = 'deferred', reviewed_by = auth.uid(), reviewed_at = now()
      WHERE id = p_match_id;
    -- living↔living never reaches owners (§5.2); otherwise hand to owner hints.
    IF NOT v_both THEN
      INSERT INTO public.match_hints(match_id, owner_user_id, counterpart_person_id)
        VALUES (p_match_id, v_owner_a, m.person_b_id), (p_match_id, v_owner_b, m.person_a_id)
        ON CONFLICT (match_id, owner_user_id) DO NOTHING;
      PERFORM public.create_match_notification(v_owner_a, 'connection_review', p_match_id, NULL, v_one);
      PERFORM public.create_match_notification(v_owner_b, 'connection_review', p_match_id, NULL, v_one);
    END IF;
    RETURN;
  END IF;

  -- p_decision = 'approve'
  UPDATE public.matches SET notes = p_note WHERE id = p_match_id;
  UPDATE public.matches SET status = 'admin_approved', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_match_id;

  IF v_one THEN
    -- a living person is involved → NEVER fuse on admin authority; require dual-owner
    -- confirmation. Create a proposed link; both-living stays admin-only (no owners).
    INSERT INTO public.person_links(person_a_id, person_b_id, status, link_type,
        source_match_id, confidence_score, source)
      VALUES (m.person_a_id, m.person_b_id, 'proposed', 'same_as', p_match_id, m.confidence_score, 'admin')
      ON CONFLICT (person_a_id, person_b_id) DO UPDATE SET source_match_id = EXCLUDED.source_match_id
      RETURNING id INTO v_link;
    INSERT INTO public.merge_log(action, person_link_id, match_id, actor_user_id, actor_role, after_state)
      VALUES ('link', v_link, p_match_id, auth.uid(), 'admin',
              jsonb_build_object('status','proposed','reason','living_requires_dual_owner'));
    IF NOT v_both THEN
      INSERT INTO public.match_hints(match_id, owner_user_id, counterpart_person_id)
        VALUES (p_match_id, v_owner_a, m.person_b_id), (p_match_id, v_owner_b, m.person_a_id)
        ON CONFLICT (match_id, owner_user_id) DO NOTHING;
      PERFORM public.create_match_notification(v_owner_a, 'connection_review', p_match_id, v_link, true);
      PERFORM public.create_match_notification(v_owner_b, 'connection_review', p_match_id, v_link, true);
    END IF;
  ELSE
    -- both deceased → an admin may fuse directly.
    INSERT INTO public.person_links(person_a_id, person_b_id, status, link_type,
        source_match_id, confidence_score, source, reviewed_by, reviewed_at)
      VALUES (m.person_a_id, m.person_b_id, 'confirmed', 'same_as', p_match_id, m.confidence_score,
              'admin', auth.uid(), now())
      ON CONFLICT (person_a_id, person_b_id) DO UPDATE
        SET status = 'confirmed', reviewed_by = auth.uid(), reviewed_at = now(),
            source_match_id = EXCLUDED.source_match_id
      RETURNING id INTO v_link;
    INSERT INTO public.merge_log(action, person_link_id, match_id, actor_user_id, actor_role, after_state)
      VALUES ('confirm', v_link, p_match_id, auth.uid(), 'admin', jsonb_build_object('status','confirmed'));
    PERFORM public.enqueue_overlay_refresh('admin_confirm', v_link);
    PERFORM public.create_match_notification(v_owner_a, 'connection_confirmed', p_match_id, v_link, false);
    PERFORM public.create_match_notification(v_owner_b, 'connection_confirmed', p_match_id, v_link, false);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_match(uuid, text, text) TO authenticated;
COMMENT ON FUNCTION public.resolve_match IS
  'Admin approve/reject/defer. Approve fuses deceased pairs directly but routes any living-involved pair to dual-owner confirmation (never auto/admin-fuse a living person). Status flips are audited by the matches trigger.';

-- ── resolve_match_hint — an owner accepts/declines their side ─────────────────
CREATE OR REPLACE FUNCTION public.resolve_match_hint(p_hint_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  h public.match_hints%ROWTYPE;
  m public.matches%ROWTYPE;
  v_other_accepted boolean;
  v_one boolean; v_both boolean;
  v_owner_a uuid; v_owner_b uuid;
  v_link uuid;
BEGIN
  SELECT * INTO h FROM public.match_hints WHERE id = p_hint_id;
  IF h.id IS NULL THEN RAISE EXCEPTION 'hint_not_found' USING ERRCODE = 'P0002'; END IF;
  IF h.owner_user_id <> auth.uid() THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;

  UPDATE public.match_hints
    SET status = CASE WHEN p_accept THEN 'accepted'::public.hint_status ELSE 'rejected'::public.hint_status END,
        updated_at = now()
    WHERE id = p_hint_id;

  -- A decline is never revealed to the counterpart (§5.3): just record and return.
  IF NOT p_accept THEN RETURN; END IF;

  SELECT * INTO m FROM public.matches WHERE id = h.match_id;
  -- has the OTHER owner accepted too?
  SELECT EXISTS (
    SELECT 1 FROM public.match_hints
    WHERE match_id = h.match_id AND owner_user_id <> h.owner_user_id AND status = 'accepted'
  ) INTO v_other_accepted;

  IF v_other_accepted THEN
    -- dual-owner consent → confirm the link (valid even for a living person: it is
    -- human dual consent, not an auto-link).
    INSERT INTO public.person_links(person_a_id, person_b_id, status, link_type,
        source_match_id, confidence_score, source, reviewed_by, reviewed_at)
      VALUES (m.person_a_id, m.person_b_id, 'confirmed', 'same_as', m.id, m.confidence_score,
              'owner_pair', auth.uid(), now())
      ON CONFLICT (person_a_id, person_b_id) DO UPDATE
        SET status = 'confirmed', reviewed_by = auth.uid(), reviewed_at = now()
      RETURNING id INTO v_link;
    UPDATE public.matches SET status = 'admin_approved', reviewed_at = now() WHERE id = m.id;
    INSERT INTO public.merge_log(action, person_link_id, match_id, actor_user_id, actor_role, after_state)
      VALUES ('confirm', v_link, m.id, auth.uid(), 'owner', jsonb_build_object('status','confirmed','via','dual_owner'));
    PERFORM public.enqueue_overlay_refresh('dual_owner_confirm', v_link);

    SELECT one_living, both_living INTO v_one, v_both FROM public.match_living_flags(m.id);
    v_owner_a := public.match_person_owner(m.person_a_id);
    v_owner_b := public.match_person_owner(m.person_b_id);
    PERFORM public.create_match_notification(v_owner_a, 'connection_confirmed', m.id, v_link, v_one);
    PERFORM public.create_match_notification(v_owner_b, 'connection_confirmed', m.id, v_link, v_one);
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_match_hint(uuid, boolean) TO authenticated;
COMMENT ON FUNCTION public.resolve_match_hint IS
  'Owner accepts/declines their side of a match. A decline is silent (never revealed). When BOTH owners accept, the same_as link is confirmed and the overlay refresh is queued.';

-- ── confirm_person_link — admin finalizer ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_person_link(p_link_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE l public.person_links%ROWTYPE; v_one boolean; v_owner_a uuid; v_owner_b uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO l FROM public.person_links WHERE id = p_link_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'link_not_found' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.person_links SET status = 'confirmed', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_link_id;
  INSERT INTO public.merge_log(action, person_link_id, match_id, actor_user_id, actor_role,
      before_state, after_state)
    VALUES ('confirm', p_link_id, l.source_match_id, auth.uid(), 'admin',
            jsonb_build_object('status', l.status), jsonb_build_object('status','confirmed'));
  PERFORM public.enqueue_overlay_refresh('confirm', p_link_id);

  v_owner_a := public.match_person_owner(l.person_a_id);
  v_owner_b := public.match_person_owner(l.person_b_id);
  v_one := public.is_person_living(l.person_a_id) OR public.is_person_living(l.person_b_id);
  PERFORM public.create_match_notification(v_owner_a, 'connection_confirmed', l.source_match_id, p_link_id, v_one);
  PERFORM public.create_match_notification(v_owner_b, 'connection_confirmed', l.source_match_id, p_link_id, v_one);
END $$;
GRANT EXECUTE ON FUNCTION public.confirm_person_link(uuid) TO authenticated;

-- ── reject_person_link — admin ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reject_person_link(p_link_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE l public.person_links%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501'; END IF;
  SELECT * INTO l FROM public.person_links WHERE id = p_link_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'link_not_found' USING ERRCODE = 'P0002'; END IF;
  UPDATE public.person_links SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_link_id;
  INSERT INTO public.merge_log(action, person_link_id, match_id, actor_user_id, actor_role,
      before_state, after_state)
    VALUES ('reject', p_link_id, l.source_match_id, auth.uid(), 'admin',
            jsonb_build_object('status', l.status), jsonb_build_object('status','rejected'));
END $$;
GRANT EXECUTE ON FUNCTION public.reject_person_link(uuid) TO authenticated;

-- ── revoke_person_link — full teardown (admin OR an involved owner) ──────────
CREATE OR REPLACE FUNCTION public.revoke_person_link(p_link_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  l public.person_links%ROWTYPE;
  v_tree_a uuid; v_tree_b uuid;
BEGIN
  SELECT * INTO l FROM public.person_links WHERE id = p_link_id;
  IF l.id IS NULL THEN RAISE EXCEPTION 'link_not_found' USING ERRCODE = 'P0002'; END IF;

  SELECT tree_id INTO v_tree_a FROM public.persons WHERE id = l.person_a_id;
  SELECT tree_id INTO v_tree_b FROM public.persons WHERE id = l.person_b_id;
  IF NOT (public.is_admin() OR public.can_write_tree(v_tree_a) OR public.can_write_tree(v_tree_b)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  -- (0) flip state + audit
  UPDATE public.person_links SET status = 'revoked', reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = p_link_id;
  INSERT INTO public.merge_log(action, person_link_id, match_id, actor_user_id, actor_role,
      before_state, after_state)
    VALUES ('revoke', p_link_id, l.source_match_id, auth.uid(),
            CASE WHEN public.is_admin() THEN 'admin' ELSE 'owner' END,
            jsonb_build_object('status', l.status), jsonb_build_object('status','revoked'));

  -- (a/c) retract notifications + expire relay tokens tied to this link/match
  DELETE FROM public.notifications WHERE person_link_id = p_link_id;
  UPDATE public.contact_relay SET revoked_at = now()
    WHERE match_id = l.source_match_id AND revoked_at IS NULL;

  -- (b) invalidate any cached degree path that could have used the hop, so it
  -- recomputes without the link (the real same_as hop lands in B19).
  DELETE FROM public.match_paths
    WHERE source_person_id IN (l.person_a_id, l.person_b_id)
       OR target_person_id IN (l.person_a_id, l.person_b_id);

  -- (d) queue the overlay refresh (deferred; the matview drops the pair on rebuild)
  PERFORM public.enqueue_overlay_refresh('revoke', p_link_id);
END $$;
GRANT EXECUTE ON FUNCTION public.revoke_person_link(uuid) TO authenticated;
COMMENT ON FUNCTION public.revoke_person_link IS
  'Reversible teardown of a same_as edge (admin or involved owner): flip to revoked + merge_log, retract notifications, expire relay tokens, invalidate cached degree paths, and QUEUE the overlay refresh (never synchronous).';
