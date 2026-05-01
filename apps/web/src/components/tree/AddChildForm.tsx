'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
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
import { addChildAction } from '@/data/user/families';
import { insertPersonAction } from '@/data/user/persons';
import { insertPlaceholderMotherAction } from '@/data/user/persons';
import type { Person } from '@/types/database';

import { PersonSelect } from './PersonSelect';
import { FieldHint } from './FieldHint';

const addChildFormSchema = z
  .object({
    treeId: z.string().uuid(),
    fatherId: z.string().uuid(),
    motherId: z.string().uuid().nullable(),
    arGivenName: z.string().trim().min(1, 'الاسم الأول مطلوب'),
    arSurname: z.string().optional(),
    gender: z.enum(['M', 'F']),
    birthYear: z
      .preprocess(
        (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
        z.number().int().gte(1000).lte(new Date().getUTCFullYear()).optional()
      ),
  })
  // FRS rule 11: every child must have a mother. If the user hasn't
  // picked one we auto-create a placeholder during submit instead of
  // blocking the form — but we expose that as an explicit "use placeholder"
  // checkbox so it's never accidental.
  .extend({
    useMotherPlaceholder: z.boolean().default(false),
  })
  .refine(
    (v) => v.motherId !== null || v.useMotherPlaceholder === true,
    {
      message: 'يجب ربط كل ابن بأم. إذا لم تعرف الأم، فعّل "أم مؤقتة".',
      path: ['motherId'],
    }
  );

type FormValues = z.infer<typeof addChildFormSchema>;

interface Props {
  readonly treeId: string;
  readonly fatherId: string;
  readonly persons: readonly Person[];
  readonly onSuccess?: () => void;
}

/**
 * Inline "Add Child" form launched from a father's person page.
 *
 * Enforces FRS rule 11 at the schema level (motherId required OR the
 * user explicitly opts into "Female N" placeholder). For multi-spouse
 * fathers, the mother combobox is filtered to existing F persons in
 * the tree so the user picks the correct wife.
 */
export function AddChildForm({
  treeId,
  fatherId,
  persons,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(addChildFormSchema),
    defaultValues: {
      treeId,
      fatherId,
      motherId: null,
      useMotherPlaceholder: false,
      gender: 'M',
      arGivenName: '',
      arSurname: '',
    },
  });

  const useMotherPlaceholder = form.watch('useMotherPlaceholder');

  function handleSubmit(values: FormValues) {
    startTransition(async () => {
      // Step 1: resolve motherId — create placeholder if needed.
      let motherId = values.motherId;
      if (motherId === null && values.useMotherPlaceholder) {
        const placeholder = await insertPlaceholderMotherAction({
          treeId: values.treeId,
          fatherId: values.fatherId,
        });
        if (placeholder?.serverError || !placeholder?.data?.placeholderId) {
          toast.error(
            placeholder?.serverError ?? 'فشل إنشاء الأم المؤقتة'
          );
          return;
        }
        motherId = placeholder.data.placeholderId;
      }
      if (!motherId) {
        toast.error('يجب تحديد الأم');
        return;
      }

      // Step 2: create the child person.
      const personResult = await insertPersonAction({
        treeId: values.treeId,
        gender: values.gender,
        arGivenName: values.arGivenName,
        arSurname: values.arSurname || undefined,
        birthYear: values.birthYear,
      });
      if (personResult?.serverError || !personResult?.data?.personId) {
        toast.error(personResult?.serverError ?? 'فشل إضافة الابن');
        return;
      }

      // Step 3: link the child to the father+mother family.
      const link = await addChildAction({
        treeId: values.treeId,
        childId: personResult.data.personId,
        fatherId: values.fatherId,
        motherId,
        pedigree: 'birth',
      });
      if (link?.serverError) {
        toast.error(link.serverError);
        return;
      }

      toast.success('تم إضافة الابن/الابنة بنجاح');
      form.reset();
      onSuccess?.();
      router.refresh();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid gap-4 rounded-lg border p-4"
        dir="rtl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="arGivenName"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>الاسم الأول</FormLabel>
                  <FieldHint fieldKey="arGivenName" />
                </div>
                <FormControl>
                  <Input dir="rtl" placeholder="سامي" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الجنس</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
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
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="motherId"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormLabel>الأم</FormLabel>
                  <FieldHint fieldKey="gender" />
                </div>
                <FormControl>
                  <PersonSelect
                    value={field.value}
                    onChange={(id) => {
                      field.onChange(id);
                      if (id) {
                        form.setValue('useMotherPlaceholder', false);
                      }
                    }}
                    persons={persons}
                    filterGender="F"
                    placeholder="اختر الأم"
                  />
                </FormControl>
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
                    placeholder="1980"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="useMotherPlaceholder"
          render={({ field }) => (
            <label className="flex items-start gap-2 rounded border border-dashed border-amber-500/60 bg-amber-50/50 p-3 text-sm dark:bg-amber-950/20">
              <input
                type="checkbox"
                className="mt-1"
                checked={field.value}
                onChange={(e) => {
                  field.onChange(e.target.checked);
                  if (e.target.checked) {
                    form.setValue('motherId', null);
                  }
                }}
                disabled={form.watch('motherId') !== null}
              />
              <span>
                <strong>أم مؤقتة</strong> — لا أعرف الأم الآن. سيُنشئ
                النظام سجلًا مؤقتًا ("أنثى N") يمكن تحديثه لاحقًا.
              </span>
            </label>
          )}
        />

        <div className="flex items-center justify-end gap-2">
          <Button
            type="submit"
            disabled={isPending}
          >
            {isPending
              ? 'جارٍ الحفظ…'
              : useMotherPlaceholder
                ? 'حفظ مع أم مؤقتة'
                : 'حفظ'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
