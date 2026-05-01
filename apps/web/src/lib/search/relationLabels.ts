import type { PathNode } from '@/data/user/degrees';

/**
 * Translate a BFS path into a human kinship label.
 * v1: ENGLISH-first labels (Arabic kinship taxonomy is ~30 terms; deferred per D3 D5).
 */
export function kinshipLabel(
  degrees: number,
  path: PathNode[],
  locale: 'ar' | 'en',
): string {
  if (degrees === 0) return locale === 'ar' ? 'أنت' : 'You';

  // Compose by scanning the path relations (skip index 0 which is 'self')
  const rels = path.slice(1).map((n) => n.relation);

  // 1-hop: direct
  if (rels.length === 1) {
    const r = rels[0];
    if (locale === 'ar') {
      return r === 'parent' ? 'والد/ة' : r === 'child' ? 'ابن/ابنة' : r === 'spouse' ? 'زوج/ة' : 'شقيق/ة';
    }
    return r === 'parent' ? 'parent' : r === 'child' ? 'child' : r === 'spouse' ? 'spouse' : 'sibling';
  }

  // 2-hop grandparent / grandchild / aunt-uncle / niece-nephew
  if (rels.length === 2) {
    const [r1, r2] = rels;
    const key = `${r1}-${r2}`;
    const en: Record<string, string> = {
      'child-child': 'grandparent',      // up then up
      'parent-parent': 'grandchild',     // down then down
      'child-sibling': 'aunt/uncle',     // up to parent, then parent's sibling
      'sibling-parent': 'niece/nephew',  // sibling of yours, then their child
      'child-spouse': 'step-parent',
      'spouse-child': 'step-child',
      'sibling-sibling': 'sibling',
      'spouse-sibling': 'sibling-in-law',
      'sibling-spouse': 'sibling-in-law',
    };
    const ar: Record<string, string> = {
      'child-child': 'جدّ/ة',
      'parent-parent': 'حفيد/ة',
      'child-sibling': 'عمّ/عمّة أو خال/ة',
      'sibling-parent': 'ابن/ت أخ أو أخت',
      'child-spouse': 'زوج/ة الوالد',
      'spouse-child': 'ربيب/ة',
      'sibling-sibling': 'شقيق/ة',
      'spouse-sibling': 'نسيب/ة',
      'sibling-spouse': 'نسيب/ة',
    };
    if (locale === 'ar') return ar[key] ?? `${degrees}°`;
    return en[key] ?? `${degrees}°`;
  }

  // 3-hop: first cousin is the canonical case
  if (rels.length === 3) {
    const str = rels.join('-');
    if (str === 'child-sibling-parent') return locale === 'ar' ? 'ابن/ت عمّ أو خال' : 'first cousin';
    if (str === 'parent-sibling-child') return locale === 'ar' ? 'ابن/ت عمّ/خال' : 'first cousin';
    return locale === 'ar' ? `قريب/ة (${degrees}°)` : `${degrees}° cousin`;
  }

  // 4+ hop → N-th cousin approximation
  const cousinDegree = Math.max(1, Math.floor((degrees - 1) / 2));
  return locale === 'ar' ? `قريب/ة من الدرجة ${cousinDegree}` : `${cousinDegree}${ordinal(cousinDegree)} cousin`;
}

function ordinal(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'st';
  if (mod10 === 2 && mod100 !== 12) return 'nd';
  if (mod10 === 3 && mod100 !== 13) return 'rd';
  return 'th';
}
