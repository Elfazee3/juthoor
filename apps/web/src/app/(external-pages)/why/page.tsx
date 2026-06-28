import { InfoPage, type InfoPageContent } from '@/components/InfoPage';

export const metadata = {
  title: 'لماذا جذور — Why Juthoor',
  description: 'Why the Palestinian Roots Platform exists — identity, the right of return, and a race against time.',
};

const CONTENT: InfoPageContent = {
  kickerAr: 'لماذا',
  kickerEn: 'Why',
  titleAr: 'لماذا نفعل هذا',
  titleEn: 'Why we do this',
  leadAr: 'لأنّ لا شعب يجب أن يناضل هكذا ليثبت أنّه موجود — ولأنّ ذاكرة جيلٍ كامل على وشك أن تختفي.',
  leadEn: 'Because no people should have to fight this hard to prove they exist — and because the memory of an entire generation is about to disappear.',
  sections: [
    {
      hAr: 'الهوية ليست شعورًا فقط',
      hEn: 'Identity is more than a feeling',
      bodyAr: [
        'أن تكون فلسطينيًّا في الشتات أمرٌ معقّد. تكبر وأنت تعرف أنّك فلسطيني، لكنّ الصلة قد تبدو مجرّدة. الجيل يكبر، والخيط يرتخي.',
        'منصّة الجذور تشدّ الخيط من جديد: اسم جدّتك الكبرى، القرية التي أتت منها، أبناء عمومةٍ في ثلاث قارّات. حقيقة موثّقة يمكنك أن تُريها لأبنائك.',
      ],
      bodyEn: [
        'Being Palestinian in the diaspora is complicated. You grow up knowing you are Palestinian, but the connection can feel abstract — and quietly, the thread loosens.',
        'Juthoor pulls that thread tight again: your great-grandmother’s name, the village she came from, cousins across three continents. A documented fact you can show your children.',
      ],
    },
    {
      hAr: 'سباقٌ مع الزمن',
      hEn: 'A race against time',
      bodyAr: [
        'الجيل الذي عاش في فلسطين قبل 1948 يكاد يختفي. خلال سنواتٍ قليلة، لن توجد ذاكرة فلسطين — الشوارع، البيوت، رائحة بساتين الزيتون — إلّا فيما كُتب.',
        'كلّ عائلة توثّق قصّتها قبل أن يرحل كبارها تربح جزءًا من هذا السباق.',
      ],
      bodyEn: [
        'The generation that lived in Palestine before 1948 is almost gone. Within a few years, the memory of Palestine — specific streets, houses, the smell of olive groves — will exist only in what has been written down.',
        'Every family that records its story before its elders are gone wins a piece of that race.',
      ],
    },
    {
      hAr: 'الذاكرة تصبح دليلًا',
      hEn: 'Memory becomes evidence',
      bodyAr: [
        'حقّ العودة معترفٌ به في القانون الدولي، لكنّ الحقوق على الورق قويّة بقدر قدرتك على إثباتها. بتوثيق نسبك — جيلًا بعد جيل، مرتبطًا بقريةٍ بعينها — تبني سجلًّا دائمًا لا يُصادَر ولا يُحرَق.',
      ],
      bodyEn: [
        'The right of return is recognised in international law, but rights on paper are only as strong as your ability to prove them. By documenting your lineage — generation by generation, linked to a specific village — you build a permanent record that cannot be confiscated or burned.',
      ],
    },
    {
      hAr: 'يستحيل المحو',
      hEn: 'Making erasure impossible',
      bodyAr: [
        'قريةٌ تتذكّرها عائلةٌ واحدة يمكن إنكارها. قريةٌ توثّقها ألف عائلة — بالأسماء والتواريخ والصور والأنساب — لا يمكن إنكارها. نجعل التاريخ الفلسطيني أكبر وأدقّ وأكثر إنسانيّةً من أن يُمحى.',
      ],
      bodyEn: [
        'A village remembered by one family can be dismissed. A village documented by a thousand families — with names, dates, photographs, and lineages — cannot. We make Palestinian history too large, too detailed, and too human to erase.',
      ],
    },
  ],
  ctaAr: 'ابدأ شجرة عائلتك',
  ctaEn: 'Start your family tree',
  ctaHref: '/sign-up',
};

export default function WhyPage() {
  return <InfoPage content={CONTENT} />;
}
