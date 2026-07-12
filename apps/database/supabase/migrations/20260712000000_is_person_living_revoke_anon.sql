-- Post-live-apply hardening (advisor follow-up to 20260711010000_degrees_masking).
--
-- Supabase's default privileges grant EXECUTE on new functions directly to anon /
-- authenticated / service_role, so B3's `REVOKE ... FROM PUBLIC` left anon able to
-- call is_person_living via /rest/v1/rpc — a living-status oracle for anonymous
-- callers holding a person uuid. Keep it authenticated-only (the app calls it from
-- authenticated sessions and inside DEFINER functions; anon search goes through
-- search_master_tree, which applies the mask internally as DEFINER).
REVOKE EXECUTE ON FUNCTION public.is_person_living(uuid) FROM anon;
