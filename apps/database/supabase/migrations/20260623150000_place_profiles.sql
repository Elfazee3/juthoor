-- ============================================================================
-- place_profiles — editorial enrichment for the Villages, Cities & Clans pages
-- ----------------------------------------------------------------------------
-- 1:1 with public.places, kept in a SEPARATE table on purpose: the core
-- `places` queries (and the dashboard "village discoveries" that read them) are
-- never touched by editorial changes. Adds the historical overview, "what
-- remains today", historical population, source attribution, and curated
-- external archive links shown on the VCC record (design flow 6.X.1.1.1).
--
-- Content policy (mirrors the on-page legal note): historical text is written
-- independently from public-domain sources; we do NOT reproduce Zochrot/iReturn
-- copyrighted write-ups — we link out to them instead.
-- ============================================================================

create table if not exists public.place_profiles (
  place_id                uuid primary key references public.places(id) on delete cascade,
  historical_overview_ar  text,
  historical_overview_en  text,
  what_remains_ar         text,
  what_remains_en         text,
  population_year         integer,
  population_count        integer,
  source_attribution_ar   text,
  source_attribution_en   text,
  external_links          jsonb       not null default '[]'::jsonb,
  updated_at              timestamptz not null default now(),
  updated_by              uuid        references auth.users(id) on delete set null
);

comment on table public.place_profiles is
  'Editorial enrichment (history, what-remains, population, sources, external links) for places. 1:1 with places. Read-public, write-admin.';

alter table public.place_profiles enable row level security;

-- Public read: these are public village/heritage pages.
drop policy if exists "place_profiles_public_read" on public.place_profiles;
create policy "place_profiles_public_read"
  on public.place_profiles for select
  using (true);

-- Admin-only write: matches the "Administrator manages the canonical record" model.
drop policy if exists "place_profiles_admin_write" on public.place_profiles;
create policy "place_profiles_admin_write"
  on public.place_profiles for all
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ----------------------------------------------------------------------------
-- Worked example from the design mockup: Al-Tira (Haifa subdistrict), 1948.
-- Idempotent: matches the seeded place by name + district, inserts once.
-- ----------------------------------------------------------------------------
insert into public.place_profiles (
  place_id,
  historical_overview_ar, historical_overview_en,
  what_remains_ar, what_remains_en,
  population_year, population_count,
  source_attribution_ar, source_attribution_en,
  external_links
)
select
  p.id,
  'كانت الطيرة قرية فلسطينية عربية كبيرة تقع على السهل الساحلي جنوب حيفا، عُرفت ببساتين الحمضيات وقربها من البحر. قبل عام 1948 كانت من أكبر القرى في قضاء حيفا، وفيها مسجد وعدة مدارس واقتصاد محلي يعتمد على الزراعة وصيد الأسماك. احتُلت القرية وهُجّر سكانها خلال حرب 1948؛ فرّ معظمهم إلى مدن وقرى ومخيمات قريبة، ويعيش أحفادهم اليوم في بلاد الشام والخليج وخارجها.',
  'Al-Tira was a large Palestinian Arab village located on the coastal plain south of Haifa, known for its citrus groves and proximity to the sea. Before 1948 it was one of the larger villages in the Haifa subdistrict, with a mosque, several schools, and a local economy built around agriculture and fishing. The village was occupied and its population expelled during the 1948 war; most residents fled to nearby towns and refugee camps, with descendants now living across the Levant, the Gulf, and beyond.',
  'الموقع الأصلي للقرية مغطى إلى حد كبير بالبناء، لكن أجزاء من الأرض الزراعية وبعض الآثار الهيكلية موثقة في المسوحات الميدانية. سجّل الباحثون والزائرون من الأحفاد مواقع مقبرة القرية وأساسات عدة منازل.',
  'The original village site is largely built over, though portions of the agricultural land and some structural remains are documented in field surveys. Researchers and visiting descendants have recorded the locations of the village cemetery and the foundations of several homes.',
  1945, 5280,
  'مُجمَّع من مصادر أكاديمية ومتاحة للعامة (خالدي، «كل ما تبقى»؛ سجلات مساحة فلسطين). كُتب بشكل مستقل لهذه المنصة.',
  'Compiled from public-domain gazetteers and academic sources (Khalidi, All That Remains; Survey of Palestine records). Independently written for this platform.',
  '[
    {"label_en":"Palestine Remembered — al-Tira","label_ar":"فلسطين في الذاكرة — الطيرة","url":"https://www.palestineremembered.com/Haifa/al-Tira/"},
    {"label_en":"Zochrot / iReturn","label_ar":"زوخروت / العودة","url":"https://www.zochrot.org/villages/en"}
  ]'::jsonb
from public.places p
where (p.name_en ilike 'al-tira%' or p.name_ar = 'الطيرة')
  and (coalesce(p.district_en, '') ilike 'haifa%' or coalesce(p.district_ar, '') like '%حيفا%')
order by p.name_ar
limit 1
on conflict (place_id) do nothing;
