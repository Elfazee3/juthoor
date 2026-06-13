'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  Heart,
  Network,
  Plus,
  User,
  UserPlus,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { FamilyView, PersonView } from '@/lib/tree/types';
import type { Person } from '@/types/database';

import { AddPersonForm } from './AddPersonForm';
import type { RelationshipKind } from './RelationshipPicker';

interface Props {
  readonly treeId: string;
  readonly selected: PersonView | null;
  readonly rootPersonId: string;
  /** Number of persons in the tree — drives the empty-state copy. */
  readonly personCount: number;
  /** Full DB rows passed through to the inline AddPersonForm. */
  readonly persons: readonly Person[];
  /** Family rows — lets the form resolve mothers (multi-spouse rule). */
  readonly families: readonly FamilyView[];
  /**
   * When set (from `?add=<kind>` — e.g. a card's `+` button), the add
   * sheet opens for this kind as soon as the panel mounts.
   */
  readonly initialAddKind?: AddKind | null;
}

export type AddKind = 'parent' | 'child' | 'spouse' | 'sibling';

const KIND_LABEL: Record<AddKind, string> = {
  parent: 'إضافة والدًا/والدة',
  spouse: 'إضافة زوجًا/زوجة',
  sibling: 'إضافة أخًا/أختًا',
  child: 'إضافة ابنًا/ابنة',
};

/**
 * FamilyEcho-style action sidebar pinned to the chart's start edge.
 *
 * The selected person updates from `?selected=` URL state (set by
 * ChartNode). Action buttons open a Sheet hosting the existing
 * AddPersonForm with the anchor + relationship pre-filled — the person
 * AND its family link are created server-side in one action; on success
 * the Sheet closes and `router.refresh()` re-fetches the snapshot so
 * the new person renders already connected.
 */
export function TreeSidePanel({
  treeId,
  selected,
  rootPersonId,
  personCount,
  persons,
  families,
  initialAddKind,
}: Props) {
  const router = useRouter();
  const [openKind, setOpenKind] = useState<AddKind | null>(null);

  // `?add=<kind>` deep-link (chart `+` buttons): open the sheet once a
  // person is selected.
  useEffect(() => {
    if (initialAddKind && selected) setOpenKind(initialAddKind);
  }, [initialAddKind, selected]);

  function closeSheet() {
    setOpenKind(null);
    if (initialAddKind && selected) {
      // Drop the ?add= param so re-selecting doesn't re-open the sheet.
      router.replace(`/tree/${treeId}?selected=${selected.id}`, {
        scroll: false,
      });
    }
  }

  function handleSuccess(personId: string) {
    setOpenKind(null);
    // Land the user with the freshly added person selected so the panel
    // confirms the save visually and they can keep adding from there.
    router.replace(`/tree/${treeId}?selected=${personId}`, { scroll: false });
    router.refresh();
  }

  if (!selected) {
    return (
      <aside
        dir="rtl"
        className="sticky top-4 flex w-full flex-col gap-4 rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-5 shadow-[var(--jt-shadow-sm)] md:w-[300px]"
      >
        <header className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
            لوحة الإجراءات
          </p>
          <h2
            className="text-lg font-bold text-[var(--jt-olive-900)]"
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            اختر شخصًا من الشجرة
          </h2>
          <p className="text-xs leading-relaxed text-[var(--jt-stone-600)]">
            انقر على أي بطاقة لإظهار خيارات التعديل وإضافة الأقارب من هنا
            مباشرة، دون مغادرة الشجرة.
          </p>
        </header>
        <Separator />
        <Button asChild variant="outline" className="w-full justify-start gap-2">
          <Link href={`/tree/${treeId}/add-person`}>
            <Plus className="h-4 w-4" />
            {personCount === 0 ? 'أضف أول شخص' : 'إضافة شخص جديد'}
          </Link>
        </Button>
      </aside>
    );
  }

  const label =
    selected.displayNameAr ?? selected.displayNameEn ?? 'شخص بدون اسم';
  const isFemale = selected.gender === 'F';
  const isFocus = selected.id === rootPersonId;
  const initial = label.trim().slice(0, 1);

  return (
    <>
      <aside
        dir="rtl"
        className="sticky top-4 flex w-full flex-col gap-4 rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-5 shadow-[var(--jt-shadow-sm)] md:w-[300px]"
      >
        <header className="flex items-start gap-3">
          <div
            className={cn(
              'flex h-14 w-14 flex-none items-center justify-center rounded-full border-2 text-2xl font-bold',
              isFemale
                ? 'border-[var(--jt-terra-300)]/80 bg-[var(--jt-terra-50)] text-[var(--jt-terra-700)]'
                : 'border-[var(--jt-olive-300)]/80 bg-[var(--jt-olive-50)] text-[var(--jt-olive-700)]',
            )}
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            {selected.isPlaceholder ? '·' : initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
              {selected.isPlaceholder ? 'مؤقت' : 'الشخص المحدد'}
            </p>
            <h2
              className="truncate text-lg font-bold text-[var(--jt-olive-900)]"
              style={{ fontFamily: 'var(--jt-font-display)' }}
              dir={selected.displayNameAr ? 'rtl' : 'ltr'}
            >
              {label}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--jt-stone-600)]" dir="ltr">
              {selected.birthYear ?? '?'}
              {selected.deathYear ? ` – ${selected.deathYear}` : ''}
            </p>
          </div>
        </header>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full justify-between"
        >
          <Link href={`/tree/${treeId}/person/${selected.id}`}>
            <span className="inline-flex items-center gap-2">
              <User className="h-4 w-4" />
              عرض الملف الشخصي
            </span>
            <ChevronLeft className="h-4 w-4 opacity-60" />
          </Link>
        </Button>

        <Separator />

        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
            إضافة قريب
          </p>
          <p className="text-[11px] text-[var(--jt-stone-600)]">
            سيتم ربط القريب بـ{' '}
            <span className="font-semibold text-[var(--jt-olive-800)]">
              {label}
            </span>
          </p>
        </div>

        <div className="grid gap-2">
          <ActionButton
            icon={Users}
            label={KIND_LABEL.parent}
            onClick={() => setOpenKind('parent')}
          />
          <ActionButton
            icon={Heart}
            label={KIND_LABEL.spouse}
            onClick={() => setOpenKind('spouse')}
          />
          <ActionButton
            icon={UserPlus}
            label={KIND_LABEL.sibling}
            onClick={() => setOpenKind('sibling')}
          />
          <ActionButton
            icon={Plus}
            label={KIND_LABEL.child}
            onClick={() => setOpenKind('child')}
          />
        </div>

        <Separator />

        <div className="grid gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => router.push(`/tree/${treeId}?root=${selected.id}`)}
            disabled={isFocus}
            title={isFocus ? 'هذا الشخص هو محور الشجرة بالفعل' : undefined}
          >
            <Network className="h-4 w-4" />
            عرض الشجرة من هذا الشخص
          </Button>
        </div>
      </aside>

      <Sheet
        open={openKind !== null}
        onOpenChange={(open) => !open && closeSheet()}
      >
        <SheetContent
          side="left"
          dir="rtl"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle
              className="text-right"
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              {openKind ? KIND_LABEL[openKind] : ''}
            </SheetTitle>
            <SheetDescription className="text-right">
              ربط القريب بـ{' '}
              <span className="font-semibold text-[var(--jt-olive-800)]">
                {label}
              </span>
            </SheetDescription>
          </SheetHeader>
          {openKind ? (
            <div className="mt-4">
              <AddPersonForm
                treeId={treeId}
                mode="general"
                persons={persons}
                families={families}
                initialAnchorPersonId={selected.id}
                initialRelationshipKind={
                  openKind as RelationshipKind
                }
                onSuccess={handleSuccess}
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="w-full justify-start gap-2 border-[var(--jt-olive-200)]/70 text-[var(--jt-olive-900)] hover:border-[var(--jt-olive-400)] hover:bg-[var(--jt-olive-50)]"
    >
      <Icon className="h-4 w-4 text-[var(--jt-olive-700)]" />
      {label}
    </Button>
  );
}
