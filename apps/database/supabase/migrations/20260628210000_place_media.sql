-- ============================================================================
-- Per-village Photo Gallery (flow 7.0) + Document Archive (flow 8.0)
-- ----------------------------------------------------------------------------
-- Curated, admin-maintained media for a Village/City/Clan page, stored as JSONB
-- on the existing place_profiles row (read-public, write-admin — same policy as
-- the rest of place_profiles). Additive columns; the village page degrades
-- gracefully to empty sections until this runs.
-- ============================================================================

alter table public.place_profiles
  add column if not exists gallery   jsonb not null default '[]'::jsonb;
alter table public.place_profiles
  add column if not exists documents jsonb not null default '[]'::jsonb;

comment on column public.place_profiles.gallery is
  'Curated historical / family-contributed images: [{url, caption_ar, caption_en, year}].';
comment on column public.place_profiles.documents is
  'Curated archive documents (land records, testimonies, etc): [{url, label_ar, label_en}].';

-- Seed Al-Tira's document archive with a real external archive entry so the
-- section is demonstrably populated (idempotent: only if still empty).
update public.place_profiles pp
set documents = '[{"url":"https://www.palestineremembered.com/Haifa/al-Tira/","label_en":"Palestine Remembered — al-Tira records","label_ar":"فلسطين في الذاكرة — سجلات الطيرة"}]'::jsonb
from public.places p
where pp.place_id = p.id
  and (p.name_en ilike 'al-tira%' or p.name_ar = 'الطيرة')
  and (coalesce(p.district_en, '') ilike 'haifa%' or coalesce(p.district_ar, '') like '%حيفا%')
  and pp.documents = '[]'::jsonb;
