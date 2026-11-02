'use client';

import { useEffect, useState } from 'react';
import { Check, FileCheck2, FileWarning, Hourglass, Trash2 } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  getPersonIdentifiers,
  removePersonIdentifier,
  savePersonIdentifier,
  type IdentifierKind,
  type PersonIdentifiers,
  type UnrwaStatus,
} from '@/data/user/identifiers';

/**
 * UNRWA card number and 1948 family-card number (decision D8). When two people in different
 * trees carry the same number the engine links them whatever their names score, so these are
 * shown only to people who can edit the tree. The UNRWA number matches only once a copy of
 * the card is attached under Documents (tag "UNRWA card").
 */
export function IdentityNumbersPanel({
  personId,
  canManage,
}: {
  personId: string;
  canManage: boolean;
}) {
  const { t, dir } = useLocale();
  const [ids, setIds] = useState<PersonIdentifiers | null>(null);
  const [drafts, setDrafts] = useState<Record<IdentifierKind, string>>({
    unrwa_card: '',
    family_card_1948: '',
  });
  const [busy, setBusy] = useState<IdentifierKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const loaded = await getPersonIdentifiers(personId);
    setIds(loaded);
    setDrafts({
      unrwa_card: loaded.unrwaCard ?? '',
      family_card_1948: loaded.familyCard1948 ?? '',
    });
  }

  useEffect(() => {
    if (canManage) load().catch(() => setIds(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId, canManage]);

  if (!canManage) return null;

  async function run(kind: IdentifierKind, fn: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذّر الحفظ', 'Could not save'));
    } finally {
      setBusy(null);
    }
  }

  const rows: { kind: IdentifierKind; label: string; hint: string }[] = [
    {
      kind: 'unrwa_card',
      label: t('رقم بطاقة تسجيل الأونروا', 'UNRWA registration card number'),
      hint: t(
        'يُعتمد للمطابقة فقط بعد إرفاق نسخة من البطاقة ضمن الوثائق (الوسم: بطاقة الأونروا) وتحقّق مدير المنصة من الرقم.',
        'Used for matching only once a copy of the card is attached under Documents (tag: UNRWA card) and a Platform Administrator has checked the number against it.',
      ),
    },
    {
      kind: 'family_card_1948',
      label: t('رقم البطاقة العائلية (1948)', 'Family card number (1948)'),
      hint: t(
        'بطاقة للأسرة كلها: يتطابق الرقم مع الاسم الأول نفسه فقط.',
        'Covers the whole household: matches only together with the same given name.',
      ),
    },
  ];

  return (
    <Card dir={dir}>
      <CardHeader className="space-y-1">
        <h3
          className="text-lg font-bold text-[var(--jt-olive-900)]"
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          {t('أرقام الهوية للتهجير', 'Displacement identity numbers')}
        </h3>
        <p className="text-xs text-[var(--jt-stone-500)]">
          {t(
            'حساسة: تظهر لمن يستطيع تعديل الشجرة فقط. تطابق الرقم مع شخص في شجرة أخرى يربطهما تلقائيًا.',
            'Sensitive: visible only to people who can edit the tree. The same number on a person in another tree links them automatically.',
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {rows.map((row) => {
          const saved = row.kind === 'unrwa_card' ? ids?.unrwaCard : ids?.familyCard1948;
          const draft = drafts[row.kind];
          const isBusy = busy === row.kind;
          return (
            <div key={row.kind} className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--jt-stone-700)]" htmlFor={`id-${row.kind}`}>
                {row.label}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={`id-${row.kind}`}
                  value={draft}
                  maxLength={40}
                  onChange={(e) => setDrafts((d) => ({ ...d, [row.kind]: e.target.value }))}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--jt-stone-200)] bg-white px-3 py-2 text-sm"
                  dir="ltr"
                />
                <Button
                  size="sm"
                  disabled={isBusy || draft.trim().length < 3 || draft.trim() === (saved ?? '')}
                  onClick={() =>
                    run(row.kind, () => savePersonIdentifier({ personId, kind: row.kind, value: draft }))
                  }
                >
                  <Check className="h-4 w-4" />
                  {t('حفظ', 'Save')}
                </Button>
                {saved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isBusy}
                    onClick={() => run(row.kind, () => removePersonIdentifier({ personId, kind: row.kind }))}
                    aria-label={t('حذف', 'Remove')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-[var(--jt-stone-500)]">{row.hint}</p>
              {row.kind === 'unrwa_card' && saved && ids && (
                <UnrwaStatusLine status={ids.unrwaStatus} />
              )}
            </div>
          );
        })}
        {error && <p className="text-sm text-[var(--jt-terra-600)]">{error}</p>}
      </CardContent>
    </Card>
  );
}

function UnrwaStatusLine({ status }: { status: UnrwaStatus }) {
  const { t } = useLocale();
  const states: Record<Exclude<UnrwaStatus, 'none'>, { tone: string; icon: typeof FileCheck2; text: string }> = {
    verified: {
      tone: 'text-emerald-700',
      icon: FileCheck2,
      text: t('تحقق مدير المنصة من الرقم', 'Checked by a Platform Administrator'),
    },
    awaiting_check: {
      tone: 'text-amber-700',
      icon: Hourglass,
      text: t('بانتظار تحقق مدير المنصة', 'Waiting for a Platform Administrator to check it'),
    },
    needs_copy: {
      tone: 'text-amber-700',
      icon: FileWarning,
      text: t('نسخة البطاقة مطلوبة', 'Card copy required'),
    },
    rejected: {
      tone: 'text-[var(--jt-terra-600)]',
      icon: FileWarning,
      text: t(
        'لم يطابق الرقم البطاقة: صحّحه أو أرفق نسخة أوضح',
        'The number did not match the card: correct it or attach a clearer copy',
      ),
    },
  };
  if (status === 'none') return null;
  const { tone, icon: Icon, text } = states[status];
  return (
    <p className={`inline-flex items-center gap-1.5 text-xs font-medium ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {text}
    </p>
  );
}
