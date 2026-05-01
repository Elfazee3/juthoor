-- Juthoor Step 3 Tree Builder — Atomic person + primary name creation
--
-- Supabase's JS client has no multi-statement transactions, so any
-- "Add Person" flow would leave orphaned rows if the second insert
-- failed. This RPC wraps both inserts (plus optional BIRT/DEAT events)
-- in a single Postgres function so either everything lands or nothing.
--
-- Security model:
--   - SECURITY INVOKER (default) — the caller's RLS policies apply.
--     The caller must have write access to the target tree via the
--     existing can_write_tree() helper; RLS on `persons`,
--     `person_names`, and `events` enforces that.
--   - search_path pinned to '' per Supabase security-function-search-path rule.
--
-- Gender values: schema still allows M/F/X/U. Step 3 UI restricts to
-- M/F by decision (2026-04-17) but the DB does not enforce that — it
-- is UI-layer only so future non-binary support doesn't need a
-- migration.

create or replace function public.create_person_with_primary_name(
  p_tree_id         uuid,
  p_gender          public.gender_type,
  p_name_type       public.name_type default 'birth',
  p_lang            text default 'ar',
  p_given_name      text default null,
  p_surname         text default null,
  p_display_name_ar text default null,
  p_display_name_en text default null,
  p_birth_year      int default null,
  p_death_year      int default null,
  p_place_of_origin_id uuid default null,
  p_is_placeholder  boolean default false
)
returns table (
  person_id uuid,
  name_id   uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_person_id uuid;
  v_name_id   uuid;
  v_user_id   uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- A person must have at least one of given name, AR display, or EN display.
  -- Placeholder rows are allowed to use only a display name (e.g. "Female 1").
  if coalesce(p_given_name, '') = ''
     and coalesce(p_display_name_ar, '') = ''
     and coalesce(p_display_name_en, '') = '' then
    raise exception 'At least one name (given or display) is required'
      using errcode = '22004';
  end if;

  insert into public.persons (
    tree_id,
    gender,
    display_name_ar,
    display_name_en,
    created_by,
    notes
  )
  values (
    p_tree_id,
    p_gender,
    p_display_name_ar,
    p_display_name_en,
    v_user_id,
    case when p_is_placeholder then 'placeholder' else null end
  )
  returning id into v_person_id;

  insert into public.person_names (
    person_id,
    name_type,
    is_primary,
    lang,
    given_name,
    surname
  )
  values (
    v_person_id,
    p_name_type,
    true,
    p_lang,
    p_given_name,
    p_surname
  )
  returning id into v_name_id;

  -- Optional BIRT event when a year is supplied.
  if p_birth_year is not null then
    insert into public.events (
      person_id,
      event_type,
      date_year,
      place_id
    )
    values (
      v_person_id,
      'BIRT',
      p_birth_year,
      p_place_of_origin_id
    );
  end if;

  -- Optional DEAT event.
  if p_death_year is not null then
    insert into public.events (
      person_id,
      event_type,
      date_year
    )
    values (
      v_person_id,
      'DEAT',
      p_death_year
    );
  end if;

  return query select v_person_id, v_name_id;
end;
$$;

comment on function public.create_person_with_primary_name is
  'Atomic person + primary name + optional BIRT/DEAT event creation. SECURITY INVOKER — RLS on target tables enforces authorization via can_write_tree().';

-- ============================================================================
-- Performance indexes (query-missing-indexes rule)
-- ============================================================================
-- The 360° view joins persons -> families -> family_children -> persons
-- repeatedly. Without these indexes, each neighbour lookup is a seq-scan
-- over the whole tree.

create index if not exists idx_persons_tree_id            on public.persons            (tree_id);
create index if not exists idx_family_children_family_id  on public.family_children    (family_id);
create index if not exists idx_family_children_child_id   on public.family_children    (child_id);
create index if not exists idx_families_partner1_id       on public.families           (partner1_id);
create index if not exists idx_families_partner2_id       on public.families           (partner2_id);
create index if not exists idx_person_names_person_id     on public.person_names       (person_id);
create index if not exists idx_events_person_id           on public.events             (person_id);
create index if not exists idx_events_family_id           on public.events             (family_id);

-- Partial index for primary names only — 360° hover-card reads the primary.
create index if not exists idx_person_names_primary
  on public.person_names (person_id)
  where is_primary = true;

-- Trigram index for village search (Arabic + English). Requires pg_trgm
-- extension, which Supabase has enabled by default.
create extension if not exists pg_trgm;

create index if not exists idx_places_name_ar_trgm on public.places using gin (name_ar gin_trgm_ops);
create index if not exists idx_places_name_en_trgm on public.places using gin (name_en gin_trgm_ops);
