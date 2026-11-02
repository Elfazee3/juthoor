'use client';

import { useState } from 'react';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  claimPerson,
  releasePerson,
  setAdminCanEdit,
  type RecordOwnership,
} from '@/data/user/ownership';

/**
 * Owner of the record (decision D1). A signed-in user can link their account to a living person
 * ("This is me"). The owner then controls the person's non-mandatory information: others see it
 * only if the owner allows, and the IFT Administrator can edit it only with the owner's permission.
 */
export function RecordOwnerPanel({
  personId,
  ownership,
}: {
  personId: string;
  ownership: RecordOwnership;
}) {
  const { t, dir } = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ownership.isLiving) return null;
  // Linked to someone else's account, and the viewer is not the owner: nothing to do here.
  if (ownership.isClaimed && !ownership.viewerIsOwner) return null;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('تعذّر تنفيذ الطلب', 'Could not do that'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card dir={dir}>
      <CardHeader className="space-y-1">
        <h3
          className="flex items-center gap-2 text-lg font-bold text-[var(--jt-olive-900)]"
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          {ownership.viewerIsOwner ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <UserCheck className="h-5 w-5" />
          )}
          {ownership.viewerIsOwner
            ? t('أنت صاحب هذا السجل', 'You own this record')
            : t('هل هذا أنت؟', 'Is this you?')}
        </h3>
        <p className="text-xs text-[var(--jt-stone-500)]">
          {ownership.viewerIsOwner
            ? t(
                'المعلومات غير الإلزامية عنك (الأحداث، الملاحظات، الصور، الأسماء الإضافية) تحت سيطرتك: لا يراها غيرك إلا من تسمح له، ولا يعدّلها مدير الشجرة إلا بإذنك.',
                'The non-mandatory information about you (events, notes, photos, extra names) is under your control: others see it only if you allow, and the tree’s IFT Administrator can edit it only with your permission.',
              )
            : t(
                'اربط حسابك بهذا الشخص لتتحكم في معلوماته غير الإلزامية.',
                'Link your account to this person to control their non-mandatory information.',
              )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {ownership.viewerIsOwner ? (
          <>
            {ownership.treeOwnerId && (
              <label className="flex items-start gap-2 text-sm text-[var(--jt-stone-700)]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={ownership.adminCanEdit}
                  disabled={busy}
                  onChange={(e) => run(() => setAdminCanEdit({ personId, allow: e.target.checked }))}
                />
                {t(
                  'أسمح لمدير الشجرة بتعديل معلوماتي غير الإلزامية',
                  'Allow the tree’s IFT Administrator to edit my non-mandatory information',
                )}
              </label>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => run(() => releasePerson({ personId }))}
            >
              {t('إلغاء ربط حسابي بهذا السجل', 'Unlink my account from this record')}
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => run(() => claimPerson({ personId }))}>
            {t('نعم، هذا أنا', 'Yes, this is me')}
          </Button>
        )}
        {error && <p className="text-sm text-[var(--jt-terra-600)]">{error}</p>}
      </CardContent>
    </Card>
  );
}
