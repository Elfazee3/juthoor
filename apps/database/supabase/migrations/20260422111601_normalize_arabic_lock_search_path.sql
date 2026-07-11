
CREATE OR REPLACE FUNCTION public.normalize_arabic(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  SELECT regexp_replace(
    translate(
      coalesce(lower(txt), ''),
      'أإآٱىةؤئًٌٍَُِّْـ',
      'اااايهويّّّّّّّّ '
    ),
    '\s+', ' ', 'g'
  );
$$;
