import { InfoPage, type InfoPageContent } from '@/components/InfoPage';

export const metadata = {
  title: 'كيف يعمل — How Juthoor works',
  description: 'How the Palestinian Roots Platform works — build your tree, privately, and link into the Mother Tree.',
};

const CONTENT: InfoPageContent = {
  kickerAr: 'كيف',
  kickerEn: 'How',
  titleAr: 'كيف يعمل هذا',
  titleEn: 'How it works',
  leadAr: 'تبني شجرتك بنفسك، وتبقى ملكك — وحين تتقاطع مع عائلاتٍ أخرى، تنضمّ إلى شجرةٍ واحدة تجمع فلسطين.',
  leadEn: 'You build your own tree, it stays yours — and when it meets other families, it links into one tree that gathers Palestine.',
  sections: [
    {
      hAr: '١ — ابدأ بنفسك',
      hEn: '1 — Start with yourself',
      bodyAr: [
        'أضِف نفسك أوّلًا، ثمّ والديك وجدودك، والقرية أو المدينة التي أتت منها عائلتك. واجهةٌ عربيّةٌ أوّلًا، بعرضٍ دائري 360° حول كلّ شخص.',
      ],
      bodyEn: [
        'Add yourself first, then your parents, grandparents, and the village or city your family came from. An Arabic-first interface, with a 360° view around every person.',
      ],
    },
    {
      hAr: '٢ — الخصوصيّة بالتصميم',
      hEn: '2 — Private by design',
      bodyAr: [
        'شجرتك تخصّك. أنت تتحكّم بمن يراها. الأشخاص الأحياء يحظون بحمايةٍ إضافيّة، ولا تُعرض تفاصيلهم الحسّاسة للعامة افتراضيًّا.',
      ],
      bodyEn: [
        'Your tree is yours. You control who can see it. Living people receive extra protection, and their sensitive details are not shown publicly by default.',
      ],
    },
    {
      hAr: '٣ — الشجرة الأم',
      hEn: '3 — The Mother Tree',
      bodyAr: [
        'في نهاية كلّ يوم، يقارن النظام السجلّات بحثًا عن صلات. حين يجد تطابقًا قويًّا، يربط الشجرتين — فتجد عائلتان لم تعرف إحداهما بوجود الأخرى بعضهما. ستُعلَم دائمًا قبل أيّ ربط.',
      ],
      bodyEn: [
        'At the end of each day, the system compares records for connections. When it finds a strong match, it links the two trees — and two families who never knew the other existed find each other. You are always notified before any link.',
      ],
    },
    {
      hAr: '٤ — القرى والأصول',
      hEn: '4 — Villages & origins',
      bodyAr: [
        'كلّ شخصٍ يُربط بقريته أو مدينته الأصليّة. لكلّ قريةٍ صفحةٌ حيّة — تاريخها، وما تبقّى منها، والعائلات المنحدرة منها حول العالم.',
      ],
      bodyEn: [
        'Each person is linked to their village or city of origin. Every village has a living page — its history, what remains of it, and the families descended from it around the world.',
      ],
    },
  ],
  ctaAr: 'أنشئ شجرتك مجّانًا',
  ctaEn: 'Build your tree — free',
  ctaHref: '/sign-up',
};

export default function HowPage() {
  return <InfoPage content={CONTENT} />;
}
