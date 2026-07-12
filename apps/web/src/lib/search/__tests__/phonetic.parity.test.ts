import { describe, expect, it } from 'vitest';
import { toArabicSync } from '../phonetic';

/**
 * Parity with the SQL `transliterate_to_arabic` fallback table
 * (apps/database/supabase/migrations/20260711050000_transliterate_and_name_variants.sql).
 * Both implementations MUST fold the same Latin Palestinian names to the same
 * Arabic canonical form — otherwise a diaspora tree typed in Latin won't match
 * the Arabic-script trees it should. Keep these two in lockstep.
 */
describe('toArabicSync ↔ SQL transliterate_to_arabic parity', () => {
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['Ibrahim', 'ابراهيم'],
    ['Ibraheem', 'ابراهيم'],
    ['Abraham', 'ابراهيم'],
    ['Ahmad', 'احمد'],
    ['Ahmed', 'احمد'],
    ['Mohammad', 'محمد'],
    ['Muhammad', 'محمد'],
    ['Yousef', 'يوسف'],
    ['Joseph', 'يوسف'],
    ['Omar', 'عمر'],
    ['Hassan', 'حسن'],
    ['Khaled', 'خالد'],
    ['Fatima', 'فاطمة'],
    ['Khalil', 'خليل'],
    ['Ali', 'علي'],
  ];

  it.each(cases)('folds %s → %s (matches SQL)', (input, expected) => {
    expect(toArabicSync(input).arabic).toBe(expected);
  });

  it('passes already-Arabic input through unchanged', () => {
    expect(toArabicSync('ابراهيم').arabic).toBe('ابراهيم');
  });

  it('returns null for unknown Latin (no fallback rule)', () => {
    expect(toArabicSync('Zzxqq').arabic).toBeNull();
  });
});
