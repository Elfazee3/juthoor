-- ============================================================================
-- identity_verifications — gov-ID + family-evidence verification (mockup 02)
-- ----------------------------------------------------------------------------
-- Backs the "Verify your identity" flow (process flow 1.1): a registered user
-- uploads a government ID (and optional family-belonging evidence) which an
-- Administrator reviews and approves/denies.
--
-- Privacy Policy §3.1 / §9: identity documents are SENSITIVE — stored in a
-- PRIVATE, access-controlled bucket (owner + admin only), never public.
-- Additive: does not alter signup/auth or the existing tree-access flow.
-- ============================================================================

create table if not exists public.identity_verifications (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  -- optional: verification tied to a specific tree the user wants to manage
  tree_id              uuid references public.trees(id) on delete set null,
  id_document_path     text not null,
  id_document_type     text not null
                         check (id_document_type in ('passport','national_id','refugee_card','other')),
  family_evidence_path text,
  family_evidence_note text,
  status               text not null default 'pending'
                         check (status in ('pending','approved','rejected')),
  reviewer_note        text,
  reviewed_by          uuid references auth.users(id) on delete set null,
  reviewed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists identity_verifications_user_idx   on public.identity_verifications(user_id);
create index if not exists identity_verifications_status_idx on public.identity_verifications(status);

comment on table public.identity_verifications is
  'Gov-ID + family-evidence verification requests (mockup 02 / flow 1.1). Sensitive docs live in the private verification-docs bucket. RLS: owner reads own, admin reads/reviews all.';

alter table public.identity_verifications enable row level security;

drop policy if exists "idv_select_own_or_admin" on public.identity_verifications;
create policy "idv_select_own_or_admin" on public.identity_verifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "idv_insert_own" on public.identity_verifications;
create policy "idv_insert_own" on public.identity_verifications
  for insert to authenticated
  with check (user_id = auth.uid());

-- Only administrators review (set status/reviewer). Submitters cannot self-approve.
drop policy if exists "idv_update_admin" on public.identity_verifications;
create policy "idv_update_admin" on public.identity_verifications
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Private storage bucket for the sensitive documents
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

-- Path convention: {user_id}/{uuid}.{ext} — the first folder gates ownership.
drop policy if exists "verif_docs_insert_own" on storage.objects;
create policy "verif_docs_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "verif_docs_select_own_or_admin" on storage.objects;
create policy "verif_docs_select_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "verif_docs_delete_own_or_admin" on storage.objects;
create policy "verif_docs_delete_own_or_admin" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'verification-docs'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
