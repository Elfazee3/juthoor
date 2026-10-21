-- ============================================================================
-- Security fix: users could grant themselves admin.
-- ----------------------------------------------------------------------------
-- `profiles_update` lets a user update their own row (id = auth.uid()) and the
-- `authenticated` role holds table-level UPDATE on public.profiles, so any
-- signed-in user could PATCH /rest/v1/profiles?id=eq.<self> {"is_admin": true}
-- and unlock every is_admin()-gated policy and the /admin pages.
--
-- Fix: a BEFORE INSERT/UPDATE trigger that rejects any change to is_admin made
-- through the API roles (anon / authenticated). Privileged roles — postgres
-- (SQL editor, migrations, SECURITY DEFINER functions such as handle_new_user)
-- and service_role (server-side admin tooling, e2e setup) — are unaffected.
-- The trigger function is SECURITY INVOKER on purpose: current_user must be the
-- caller's role.
-- ============================================================================

create or replace function public.protect_profiles_is_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' and coalesce(new.is_admin, false) then
      raise exception 'is_admin can only be set by a platform administrator'
        using errcode = '42501';
    elsif tg_op = 'UPDATE' and new.is_admin is distinct from old.is_admin then
      raise exception 'is_admin can only be changed by a platform administrator'
        using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

comment on function public.protect_profiles_is_admin() is
  'Blocks anon/authenticated from setting or changing profiles.is_admin (self-escalation guard).';

drop trigger if exists trg_profiles_protect_is_admin on public.profiles;
create trigger trg_profiles_protect_is_admin
  before insert or update on public.profiles
  for each row execute function public.protect_profiles_is_admin();
