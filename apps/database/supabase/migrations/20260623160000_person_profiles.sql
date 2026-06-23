-- ============================================================================
-- person_profiles — narrative enrichment for the 360° person view
-- ----------------------------------------------------------------------------
-- Holds "Achievements" (design flow 4.X.1.1.4) and "Contribution to the cause"
-- (4.X.1.1.5) per person, bilingual. Kept SEPARATE from `persons` so the core
-- persons queries and the dashboard are never affected.
--
-- Person-scoped RLS mirrors persons / person_names exactly:
--   read  = can_access_tree(person's tree)   write = can_write_tree(person's tree)
-- ============================================================================

create table if not exists public.person_profiles (
  person_id        uuid primary key references public.persons(id) on delete cascade,
  achievements_ar  text,
  achievements_en  text,
  contribution_ar  text,
  contribution_en  text,
  updated_at       timestamptz not null default now(),
  updated_by       uuid references auth.users(id) on delete set null
);

comment on table public.person_profiles is
  'Per-person narrative (achievements, contribution to the cause) for the 360 view. 1:1 with persons. Person-scoped RLS (read=can_access_tree, write=can_write_tree).';

alter table public.person_profiles enable row level security;

create policy "person_profiles_select"
  on public.person_profiles for select
  to authenticated
  using (exists (
    select 1 from public.persons p
    where p.id = person_id and (public.can_access_tree(p.tree_id) or public.is_admin())
  ));

create policy "person_profiles_insert"
  on public.person_profiles for insert
  to authenticated
  with check (exists (
    select 1 from public.persons p
    where p.id = person_id and (public.can_write_tree(p.tree_id) or public.is_admin())
  ));

create policy "person_profiles_update"
  on public.person_profiles for update
  to authenticated
  using (exists (
    select 1 from public.persons p
    where p.id = person_id and (public.can_write_tree(p.tree_id) or public.is_admin())
  ));

create policy "person_profiles_delete"
  on public.person_profiles for delete
  to authenticated
  using (exists (
    select 1 from public.persons p
    where p.id = person_id and (public.can_write_tree(p.tree_id) or public.is_admin())
  ));
