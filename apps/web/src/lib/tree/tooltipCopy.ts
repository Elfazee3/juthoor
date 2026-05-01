/**
 * Bilingual tooltip copy for tree-builder form fields.
 *
 * Centralised here so translators (and the UX partner review) have
 * one file to edit. Keys mirror the form field names in
 * `AddPersonForm.tsx`.
 */

export interface TooltipCopy {
  readonly ar: string;
  readonly en: string;
}

export const TOOLTIP_COPY: Readonly<Record<string, TooltipCopy>> = {
  arGivenName: {
    ar: 'الاسم الأول بالعربية — مثل "أحمد" أو "فاطمة". هذا هو الاسم المفضل للعرض.',
    en: 'First name in Arabic — e.g. "أحمد" or "فاطمة". This is the preferred display name.',
  },
  arSurname: {
    ar: 'اسم العائلة بالعربية. يُورَّث تلقائيًا من الأب إن وُجد.',
    en: "Family surname in Arabic. Auto-inherits from the father when available.",
  },
  enGivenName: {
    ar: 'الاسم الأول بالإنجليزية (اختياري) — للتوافق مع وثائق الهجرة والأرشيف.',
    en: 'First name in English (optional) — for immigration documents and archives.',
  },
  enSurname: {
    ar: 'اسم العائلة بالإنجليزية (اختياري).',
    en: 'Family surname in English (optional).',
  },
  gender: {
    ar: 'الجنس. للنساء يُحفظ اسم العائلة قبل الزواج (الاسم الأصلي) وفقًا للمتطلبات الوظيفية.',
    en: 'Gender. For women, the maiden (pre-marriage) surname is stored per the FRS requirement.',
  },
  birthYear: {
    ar: 'سنة الميلاد — أربعة أرقام. اترك الحقل فارغًا إذا كانت مجهولة.',
    en: 'Birth year — four digits. Leave blank if unknown.',
  },
  deathYear: {
    ar: 'سنة الوفاة — إن كان الشخص متوفى. لا يمكن أن تسبق سنة الميلاد.',
    en: 'Death year — if the person is deceased. Cannot precede the birth year.',
  },
  placeOfOrigin: {
    ar: 'القرية أو المدينة الأصلية — اختر من قائمة القرى الفلسطينية المهجرة. يُورَّث تلقائيًا من الأب.',
    en: 'Origin village or town — pick from the depopulated villages list. Auto-inherits from the father.',
  },
};
