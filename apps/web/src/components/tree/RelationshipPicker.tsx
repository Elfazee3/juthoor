'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Baby,
  Crown,
  Heart,
  HelpCircle,
  Info,
  User,
  Users,
} from 'lucide-react';
import type { Person } from '@/types/database';
import { PersonSelect } from './PersonSelect';

/**
 * RelationshipPicker — answers the founder's request that every relation
 * type be visible and clear when adding a new person. Six explicit cards,
 * an anchor person, and a live preview line that says exactly what link
 * will be created. This is intentionally loud — the goal is that a
 * non-technical user understands the relationship BEFORE they save.
 */

export type RelationshipKind =
  | 'child'      // The new person is a CHILD of anchor
  | 'parent'     // The new person is a PARENT of anchor
  | 'spouse'     // The new person is a SPOUSE of anchor
  | 'sibling'    // The new person is a SIBLING of anchor
  | 'self'       // This is the user themselves (onboarding)
  | 'unrelated'; // No link yet — link later

export type RelationshipState = {
  kind: RelationshipKind;
  anchorPersonId: string | null;
};

const RELATION_OPTIONS: Array<{
  kind: RelationshipKind;
  ar: string;
  en: string;
  hintAr: string;
  hintEn: string;
  icon: React.ComponentType<{ className?: string }>;
  needsAnchor: boolean;
}> = [
  {
    kind: 'child',
    ar: 'ابن / ابنة',
    en: 'Child of',
    hintAr: 'ينحدر من',
    hintEn: 'Descends from',
    icon: Baby,
    needsAnchor: true,
  },
  {
    kind: 'parent',
    ar: 'والد / والدة',
    en: 'Parent of',
    hintAr: 'يأتي قبل',
    hintEn: 'Comes before',
    icon: Crown,
    needsAnchor: true,
  },
  {
    kind: 'spouse',
    ar: 'زوج / زوجة',
    en: 'Spouse of',
    hintAr: 'شريك حياة',
    hintEn: 'Life partner',
    icon: Heart,
    needsAnchor: true,
  },
  {
    kind: 'sibling',
    ar: 'أخ / أخت',
    en: 'Sibling of',
    hintAr: 'يشترك في الوالدين',
    hintEn: 'Shares parents',
    icon: Users,
    needsAnchor: true,
  },
  {
    kind: 'self',
    ar: 'هذا أنا',
    en: 'This is me',
    hintAr: 'بداية شجرتك',
    hintEn: 'Start your tree',
    icon: User,
    needsAnchor: false,
  },
  {
    kind: 'unrelated',
    ar: 'لا رابط بعد',
    en: 'No link yet',
    hintAr: 'سأربطه لاحقًا',
    hintEn: 'Connect it later',
    icon: HelpCircle,
    needsAnchor: false,
  },
];

interface Props {
  readonly persons: readonly Person[];
  readonly value: RelationshipState;
  readonly onChange: (next: RelationshipState) => void;
  /** Show a preview phrase using this draft name (the new person being added). */
  readonly draftDisplayName?: string;
  readonly locale?: 'ar' | 'en';
}

export function RelationshipPicker({
  persons,
  value,
  onChange,
  draftDisplayName,
  locale = 'ar',
}: Props) {
  const [showPicker, setShowPicker] = useState<boolean>(value.kind !== 'unrelated');

  const selected = RELATION_OPTIONS.find((r) => r.kind === value.kind);
  const anchor = persons.find((p) => p.id === value.anchorPersonId) ?? null;

  // When the user toggles to a relation that requires an anchor and we
  // haven't picked one yet, scroll the anchor selector into focus.
  useEffect(() => {
    if (selected?.needsAnchor && !value.anchorPersonId) {
      // no-op — just for clarity
    }
  }, [selected, value.anchorPersonId]);

  const isAr = locale === 'ar';

  function pick(kind: RelationshipKind) {
    onChange({
      kind,
      // Drop anchor when switching to a kind that doesn't need it.
      anchorPersonId:
        RELATION_OPTIONS.find((r) => r.kind === kind)?.needsAnchor
          ? value.anchorPersonId
          : null,
    });
    setShowPicker(true);
  }

  return (
    <section
      aria-label={isAr ? 'صلة القرابة' : 'Relationship'}
      className="rounded-3xl border border-[var(--jt-olive-200)]/60 bg-gradient-to-b from-[var(--jt-olive-50)]/60 to-transparent p-5 md:p-6"
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--jt-olive-700)]">
            {isAr ? 'صلة القرابة' : 'Relationship'}
          </p>
          <h2
            className="text-xl font-bold text-[var(--jt-olive-900)] md:text-2xl"
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            {isAr
              ? 'كيف يرتبط هذا الشخص بشجرتك؟'
              : 'How is this person connected to your tree?'}
          </h2>
          <p className="mt-1 text-sm text-[var(--jt-stone-600)]">
            {isAr
              ? 'اختر نوع العلاقة لنعرف كيف نربطه. سترى قبل الحفظ معاينة واضحة.'
              : 'Pick the relationship — you will see a clear preview before saving.'}
          </p>
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {RELATION_OPTIONS.map((opt) => {
          const isActive = opt.kind === value.kind;
          const Icon = opt.icon;
          return (
            <button
              key={opt.kind}
              type="button"
              onClick={() => pick(opt.kind)}
              aria-pressed={isActive}
              className={
                'group relative flex flex-col items-start gap-2 rounded-2xl border px-3.5 py-3 text-start transition-all '
                + 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jt-gold-400)] '
                + (isActive
                  ? 'border-transparent bg-[var(--jt-olive-700)] text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)]'
                  : 'border-[var(--jt-stone-200)] bg-[var(--card)] text-[var(--jt-stone-800)] hover:-translate-y-0.5 hover:border-[var(--jt-olive-400)]')
              }
            >
              <span
                className={
                  'inline-flex h-8 w-8 items-center justify-center rounded-xl '
                  + (isActive
                    ? 'bg-[var(--jt-gold-400)] text-[var(--jt-olive-900)]'
                    : 'bg-[var(--jt-olive-100)] text-[var(--jt-olive-700)] group-hover:bg-[var(--jt-olive-200)]')
                }
              >
                <Icon className="h-4 w-4" />
              </span>
              <span
                className="text-[14px] font-bold leading-tight"
                style={{
                  fontFamily: isAr ? 'var(--jt-font-display)' : 'var(--jt-font-latin)',
                }}
              >
                {isAr ? opt.ar : opt.en}
              </span>
              <span
                className={
                  'text-[11px] leading-snug '
                  + (isActive ? 'text-[var(--jt-olive-100)]' : 'text-[var(--jt-stone-500)]')
                }
              >
                {isAr ? opt.hintAr : opt.hintEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* Anchor person picker */}
      {selected?.needsAnchor && showPicker && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-5 rounded-2xl border border-[var(--jt-olive-200)]/70 bg-[var(--card)] p-4"
        >
          <label className="mb-2 block text-xs font-semibold text-[var(--jt-olive-700)]">
            {isAr
              ? `اختر الشخص المرتبط (${labelForKind(value.kind, isAr)})`
              : `Pick the related person (${labelForKind(value.kind, isAr)})`}
          </label>
          <PersonSelect
            value={value.anchorPersonId}
            onChange={(personId) =>
              onChange({ ...value, anchorPersonId: personId })
            }
            persons={persons}
            placeholder={isAr ? 'اختر شخصًا من شجرتك' : 'Pick someone from your tree'}
            emptyLabel={isAr ? 'لا يوجد أحد بعد' : 'No people yet'}
          />
        </motion.div>
      )}

      {/* Preview banner */}
      {value.kind !== 'unrelated' && (
        <PreviewBanner
          kind={value.kind}
          anchor={anchor}
          draftDisplayName={draftDisplayName}
          isAr={isAr}
          missingAnchor={Boolean(selected?.needsAnchor) && !anchor}
        />
      )}
    </section>
  );
}

function labelForKind(kind: RelationshipKind, isAr: boolean): string {
  const map: Record<RelationshipKind, [string, string]> = {
    child: ['الوالد/الوالدة الذي ينتسب إليه', 'parent'],
    parent: ['الابن/الابنة', 'child'],
    spouse: ['الزوج/الزوجة', 'spouse'],
    sibling: ['الأخ/الأخت', 'sibling'],
    self: ['', ''],
    unrelated: ['', ''],
  };
  const [ar, en] = map[kind];
  return isAr ? ar : en;
}

function PreviewBanner({
  kind,
  anchor,
  draftDisplayName,
  isAr,
  missingAnchor,
}: {
  kind: RelationshipKind;
  anchor: Person | null;
  draftDisplayName?: string;
  isAr: boolean;
  missingAnchor: boolean;
}) {
  const draft = (draftDisplayName ?? '').trim() || (isAr ? 'الشخص الجديد' : 'the new person');
  const anchorName = anchor
    ? (isAr
      ? anchor.display_name_ar ?? anchor.display_name_en ?? '—'
      : anchor.display_name_en ?? anchor.display_name_ar ?? '—')
    : (isAr ? '—' : '—');

  let message: string;
  if (missingAnchor) {
    message = isAr
      ? 'اختر الشخص المرتبط لتظهر المعاينة هنا.'
      : 'Pick the related person to see the preview here.';
  } else if (kind === 'self') {
    message = isAr
      ? `"${draft}" سيكون أنت — جذر شجرتك.`
      : `"${draft}" will be you — the root of your tree.`;
  } else if (kind === 'unrelated') {
    message = isAr
      ? `"${draft}" سيُضاف بدون رابط. تستطيع ربطه لاحقًا.`
      : `"${draft}" will be added without a link. You can connect it later.`;
  } else {
    const phraseAr: Record<RelationshipKind, string> = {
      child: `"${draft}" سيُربط ابنًا/ابنة لِـ ${anchorName}.`,
      parent: `"${draft}" سيُربط والدًا/والدة لِـ ${anchorName}.`,
      spouse: `"${draft}" سيُربط زوجًا/زوجة لِـ ${anchorName}.`,
      sibling: `"${draft}" سيُربط أخًا/أختًا لِـ ${anchorName}.`,
      self: '',
      unrelated: '',
    };
    const phraseEn: Record<RelationshipKind, string> = {
      child: `"${draft}" will be linked as a child of ${anchorName}.`,
      parent: `"${draft}" will be linked as a parent of ${anchorName}.`,
      spouse: `"${draft}" will be linked as the spouse of ${anchorName}.`,
      sibling: `"${draft}" will be linked as a sibling of ${anchorName}.`,
      self: '',
      unrelated: '',
    };
    message = isAr ? phraseAr[kind] : phraseEn[kind];
  }

  const tone = missingAnchor ? 'warn' : 'ok';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      role="status"
      aria-live="polite"
      className={
        'mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm '
        + (tone === 'warn'
          ? 'border-[var(--jt-gold-400)]/50 bg-[var(--jt-gold-100)]/40 text-[var(--jt-stone-800)]'
          : 'border-[var(--jt-olive-300)]/50 bg-[var(--jt-olive-100)]/50 text-[var(--jt-olive-900)]')
      }
    >
      <Info className="mt-0.5 h-4 w-4 flex-none" />
      <p
        className="font-medium leading-relaxed"
        style={{ fontFamily: isAr ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)' }}
      >
        {message}
      </p>
    </motion.div>
  );
}
