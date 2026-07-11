-- pgTAP: cross-script transliteration (plan §6 correctness fix #3).
BEGIN;
SELECT plan(7);

SELECT is(public.transliterate_to_arabic('Ibrahim'),  'ابراهيم', 'Ibrahim -> ابراهيم');
SELECT is(public.transliterate_to_arabic('Abraham'),  'ابراهيم', 'Abraham -> ابراهيم (cross-script)');
SELECT is(public.transliterate_to_arabic('Ibraheem'), 'ابراهيم', 'Ibraheem -> ابراهيم');
SELECT is(public.transliterate_to_arabic('ابراهيم'),  'ابراهيم', 'already-Arabic passes through');
SELECT is(public.transliterate_to_arabic('Zzxqq'),    'Zzxqq',   'unknown Latin returned unchanged');

SELECT is(
  public.normalize_arabic(public.transliterate_to_arabic('Abraham')),
  public.normalize_arabic('ابراهيم'),
  'Abraham and ابراهيم unify after transliterate + normalize');

SELECT ok(
  (SELECT count(*) FROM public.name_variants WHERE canonical = 'ابراهيم') >= 3,
  'name_variants seeded with the Ibrahim variants');

SELECT finish();
ROLLBACK;
