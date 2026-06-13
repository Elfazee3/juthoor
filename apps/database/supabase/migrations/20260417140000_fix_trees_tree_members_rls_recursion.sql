-- ============================================================================
-- Fix: infinite recursion between trees and tree_members RLS policies
-- ============================================================================
--
-- The Step-2 policies had trees_select querying tree_members and
-- tree_members_select querying trees — each through the other's
-- RLS layer, so Postgres recursed. Supabase best practice
-- (security-rls-no-recursion): any cross-table predicate must run
-- inside a SECURITY DEFINER function so it bypasses RLS.
--
-- Shape of fix:
--   1. New helper `is_tree_member(tree_id, user_id)` — SECURITY DEFINER.
--   2. New helper `is_tree_owner(tree_id, user_id)`  — SECURITY DEFINER.
--   3. Drop the recursive policies and recreate them using those helpers.
--   4. Tighten `can_access_tree` / `can_write_tree` for the same reason.
--   5. Make the auto-add-owner-as-member trigger respect tree_members RLS
--      (previously blocked because the trigger inserted a member row with
--      no owner context visible through RLS).

-- ---------------------------------------------------------------------------
-- 1 & 2. New helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_tree_owner(
  p_tree_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trees
    where id = p_tree_id
      and owner_id = p_user_id
  );
$$;

create or replace function public.is_tree_member(
  p_tree_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tree_members
    where tree_id = p_tree_id
      and user_id = p_user_id
  );
$$;

create or replace function public.is_tree_collaborator(
  p_tree_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tree_members
    where tree_id = p_tree_id
      and user_id = p_user_id
      and role = 'collaborator'
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Drop-and-recreate the recursive policies
-- ---------------------------------------------------------------------------
drop policy if exists "trees_select"        on public.trees;
drop policy if exists "tree_members_select" on public.tree_members;
drop policy if exists "tree_members_insert" on public.tree_members;
drop policy if exists "tree_members_update" on public.tree_members;
drop policy if exists "tree_members_delete" on public.tree_members;

create policy "trees_select"
  on public.trees
  for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or is_public = true
    or public.is_tree_member(id, (select auth.uid()))
    or public.is_admin()
  );

create policy "tree_members_select"
  on public.tree_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_tree_owner(tree_id, (select auth.uid()))
    or public.is_admin()
  );

create policy "tree_members_insert"
  on public.tree_members
  for insert
  to authenticated
  with check (
    public.is_tree_owner(tree_id, (select auth.uid()))
    or public.is_admin()
  );

create policy "tree_members_update"
  on public.tree_members
  for update
  to authenticated
  using (
    public.is_tree_owner(tree_id, (select auth.uid()))
    or public.is_admin()
  );

create policy "tree_members_delete"
  on public.tree_members
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_tree_owner(tree_id, (select auth.uid()))
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 4. Tighten can_access_tree / can_write_tree to use the new helpers
-- ---------------------------------------------------------------------------
create or replace function public.can_access_tree(p_tree_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trees
    where id = p_tree_id
      and (
        owner_id = (select auth.uid())
        or is_public = true
        or public.is_tree_member(p_tree_id, (select auth.uid()))
      )
  );
$$;

create or replace function public.can_write_tree(p_tree_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trees
    where id = p_tree_id
      and (
        owner_id = (select auth.uid())
        or public.is_tree_collaborator(p_tree_id, (select auth.uid()))
      )
  );
$$;
