'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { insertPersonAction } from '@/data/user/persons';
import { personInputSchema } from '@/lib/tree/zodSchemas';
import type { Person } from '@/types/database';

import { FieldHint } from './FieldHint';
import { PlaceCombobox } from './PlaceCombobox';
import {
  RelationshipPicker,
  type RelationshipKind,
  type RelationshipState,
} from './RelationshipPicker';

interface Props {
  readonly treeId: string;
  /**
   * 'self' is the onboarding first-person wizard; 'general' is the
   * regular Add Person flow from inside the tree.
   */
  readonly mode: 'self' | 'general';
  /** Existing persons in the tree — drives the relationship anchor picker. */
  readonly persons: readonly Person[];
  /** Pre-fill from URL — e.g. when navigating from a 360° "Add child" CTA. */
  readonly initialAnchorPersonId?: string | null;
  readonly initialRelationshipKind?: RelationshipKind;
}

type FormValues = z.infer<typeof personInputSchema>;

export function AddPersonForm({
  treeId,
  mode,
  persons,
  initialAnchorPersonId,
  initialRelationshipKind,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const initialKind: RelationshipKind =
    initialRelationshipKind ?? (mode === 'self' ? 'self' : 'unrelated');

  const [relationship, setRelationship] = useState<RelationshipState>({
    kind: initialKind,
    anchorPersonId: initialAnchorPersonId ?? null,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(personInputSchema),
    defaultValues: {
      treeId,
      gender: 'M',
      arGivenName: '',
      arSurname: '',
      enGivenName: '',
      enSurname: '',
    },
  });

  // Watch the name fields so the relationship preview updates live.
  const watchedAr = form.watch('arGivenName');
  const watchedEn = form.watch('enGivenName');
  const draftDisplayName =
    [watchedAr, form.watch('arSurname')].filter(Boolean).join(' ').trim()
    || [watchedEn, form.watch('enSurname')].filter(Boolean).join(' ').trim();

  function handleSubmit(values: FormValues) {
    // Block save when a relationship was picked but no anchor was chosen.
    const needsAnchor =
      relationship.kind === 'child' ||
      relationship.kind === 'parent' ||
      relationship.kind === 'spouse' ||
      relationship.kind === 'sibling';
    if (needsAnchor && !relationship.anchorPersonId) {
      toast.error('اختر الشخص المرتبط أولًا، أو اختر "لا رابط بعد".');
      return;
    }

    startTransition(async () => {
      const result = await insertPersonAction(values);

      if (result?.serverError) {
        toast.error(result.serverError);
        return;
      }

      const personId = result?.data?.personId;
      if (!personId) {
        toast.error('لم يتم إنشاء الشخص. يرجى المحاولة مرة أخرى.');
        return;
      }

      toast.success(
        mode === 'self'
          ? 'تم إنشاء ملفك الشخصي في الشجرة!'
          : 'تم إضافة الشخص بنجاح'
      );

      // Route based on relationship kind. The actual link creation is
      // handled by the existing per-relationship flows (AddChildForm etc.)
      // so we land the user on the right next step rather than silently
      // failing to wire something complex from this form.
      if (relationship.kind === 'child' && relationship.anchorPersonId) {
        // Anchor is the parent. Open the existing add-child flow with the
        // father pre-selected and the new person as the child.
        router.push(
          `/tree/${treeId}/person/${relationship.anchorPersonId}?openAddChild=1&newChildId=${personId}`
        );
      } else if (relationship.kind === 'parent' && relationship.anchorPersonId) {
        // The new person should become a parent of the anchor. Open
        // the anchor's profile with a hint.
        router.push(
          `/tree/${treeId}/person/${relationship.anchorPersonId}?linkParent=${personId}`
        );
      } else if (relationship.kind === 'spouse' && relationship.anchorPersonId) {
        router.push(
          `/tree/${treeId}/person/${relationship.anchorPersonId}?linkSpouse=${personId}`
        );
      } else if (relationship.kind === 'sibling' && relationship.anchorPersonId) {
        router.push(
          `/tree/${treeId}/person/${relationship.anchorPersonId}?linkSibling=${personId}`
        );
      } else {
        router.push(`/tree/${treeId}/person/${personId}`);
      }
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid gap-6"
        dir="rtl"
      >
        {/* === Relationship picker — visible by design === */}
        <RelationshipPicker
          persons={persons}
          value={relationship}
          onChange={setRelationship}
          draftDisplayName={draftDisplayName || undefined}
        />

        {/* === Person details === */}
        <section className="rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-5 md:p-6 shadow-[var(--jt-shadow-sm)]">
          <header className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--jt-olive-700)]">
              بيانات الشخص
            </p>
            <h2
              className="text-xl font-bold text-[var(--jt-olive-900)]"
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              الاسم والمولد
            </h2>
          </header>

          {/* Arabic name row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="arGivenName"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>الاسم الأول (بالعربية)</FormLabel>
                    <FieldHint fieldKey="arGivenName" />
                  </div>
                  <FormControl>
                    <Input
                      dir="rtl"
                      placeholder="أحمد"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="arSurname"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>اسم العائلة (بالعربية)</FormLabel>
                    <FieldHint fieldKey="arSurname" />
                  </div>
                  <FormControl>
                    <Input
                      dir="rtl"
                      placeholder="البوز"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* English name row */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="enGivenName"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>First name (English)</FormLabel>
                    <FieldHint fieldKey="enGivenName" lang="en" />
                  </div>
                  <FormControl>
                    <Input
                      dir="ltr"
                      placeholder="Ahmad"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enSurname"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Surname (English)</FormLabel>
                    <FieldHint fieldKey="enSurname" lang="en" />
                  </div>
                  <FormControl>
                    <Input
                      dir="ltr"
                      placeholder="Bouz"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Gender + years row */}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>الجنس</FormLabel>
                    <FieldHint fieldKey="gender" />
                  </div>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="M">ذكر</SelectItem>
                      <SelectItem value="F">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthYear"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>سنة الميلاد</FormLabel>
                    <FieldHint fieldKey="birthYear" />
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="1950"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deathYear"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>سنة الوفاة</FormLabel>
                    <FieldHint fieldKey="deathYear" />
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="—"
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ''
                            ? undefined
                            : Number(e.target.value)
                        )
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Village */}
          <div className="mt-4">
            <FormField
              control={form.control}
              name="placeOfOriginId"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>القرية / المدينة الأصلية</FormLabel>
                    <FieldHint fieldKey="placeOfOrigin" />
                  </div>
                  <FormControl>
                    <PlaceCombobox
                      value={field.value ?? null}
                      onChange={(placeId) => field.onChange(placeId ?? undefined)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            إلغاء
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'جارٍ الحفظ…' : 'حفظ ومتابعة'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
