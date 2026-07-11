/**
 * Client-side phonetic/transliteration helper.
 *
 * We use jslingua's Arabic transliteration module to pre-normalize user input
 * BEFORE it hits the `search_master_tree` RPC. The RPC has its own Arabic
 * phonetic folding in Postgres, but that only works on text that's already
 * Arabic script. When a user types "Ibraheem" or "Ahmad" we need to convert
 * that Latin input into Arabic first so the Postgres trigram match can fire.
 *
 * Two return values:
 *   arabic: best-guess transliteration into Arabic script
 *   original: the user's raw string (preserved for display)
 *
 * jslingua is loaded dynamically so it doesn't balloon the initial bundle.
 */

export type TransliteratedInput = {
  original: string;
  arabic: string | null; // null if input is already Arabic or transliteration failed
};

const ARABIC_RANGE = /[\u0600-\u06FF]/;

function containsArabic(s: string): boolean {
  return ARABIC_RANGE.test(s);
}

/**
 * Rough Latin→Arabic transliteration table. Used as a last-resort fallback
 * when jslingua isn't loaded (e.g. during SSR). Covers common Palestinian
 * name fragments.
 */
const FALLBACK_LATIN_TO_ARABIC: Array<[RegExp, string]> = [
  [/ibraheem|ibrahim|ebrahim|abraham/gi, 'ابراهيم'],
  [/ahmad|ahmed|achmed/gi, 'احمد'],
  [/mohammad|mohammed|muhammad|muhammed/gi, 'محمد'],
  [/yousef|youssef|yusuf|yusef|joseph/gi, 'يوسف'],
  [/omar|umar/gi, 'عمر'],
  [/hassan|hasan/gi, 'حسن'],
  [/khaled|khalid/gi, 'خالد'],
  [/fatima|fatma|fatema/gi, 'فاطمة'],
  [/aisha|ayesha/gi, 'عائشة'],
  [/samaa|sama/gi, 'سماء'],
  [/al-ajrami|alajrami|ajrami/gi, 'العجرمي'],
  [/al-hajj|alhajj|hajj/gi, 'الحاج'],
  [/al-masri|almasri|masri/gi, 'المصري'],
  [/khalil/gi, 'خليل'],
  // 'ali' is a substring of longer names (e.g. Khalil = kh-ali-l), so it MUST
  // come last — longer names transliterate first. Keeps parity with the SQL
  // transliterate_to_arabic rule order.
  [/ali/gi, 'علي'],
];

function fallbackTransliterate(input: string): string | null {
  let out = input;
  let matched = false;
  for (const [pattern, arabic] of FALLBACK_LATIN_TO_ARABIC) {
    if (pattern.test(input)) {
      out = out.replace(pattern, arabic);
      matched = true;
    }
  }
  return matched ? out.replace(/[a-z-]/gi, ' ').replace(/\s+/g, ' ').trim() : null;
}

/**
 * Transliterate arbitrary user input to Arabic. Prefers jslingua when
 * available, falls back to a small builtin table for well-known names.
 */
export async function toArabic(input: string): Promise<TransliteratedInput> {
  const trimmed = input.trim();
  if (!trimmed) return { original: input, arabic: null };
  if (containsArabic(trimmed)) return { original: trimmed, arabic: trimmed };

  // Try jslingua first — wrapped in try/catch because its API is fragile.
  try {
    const mod = (await import('jslingua')) as unknown as {
      default?: {
        nservices?: (svc: string) => string[];
        gservice?: (svc: string, lang: string) => unknown;
      };
      nservices?: (svc: string) => string[];
      gservice?: (svc: string, lang: string) => unknown;
    };
    const api = mod.default ?? mod;
    const gservice = api.gservice;
    if (typeof gservice === 'function') {
      const trans = gservice('Trans', 'ara') as
        | { trans?: (s: string, method: string) => string }
        | null;
      if (trans && typeof trans.trans === 'function') {
        // "buckwalter" is the round-trippable Latin→Arabic convention jslingua ships.
        const result = trans.trans(trimmed, 'buckwalter');
        if (result && containsArabic(result)) {
          return { original: trimmed, arabic: result };
        }
      }
    }
  } catch {
    // swallow; fall through to fallback table
  }

  const fallback = fallbackTransliterate(trimmed);
  return { original: trimmed, arabic: fallback };
}

/**
 * Synchronous best-effort transliteration — doesn't load jslingua, only uses
 * the static fallback. Useful inside event handlers where you can't await.
 */
export function toArabicSync(input: string): TransliteratedInput {
  const trimmed = input.trim();
  if (!trimmed) return { original: input, arabic: null };
  if (containsArabic(trimmed)) return { original: trimmed, arabic: trimmed };
  return { original: trimmed, arabic: fallbackTransliterate(trimmed) };
}
