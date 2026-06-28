import { InfoPage, type InfoPageContent } from '@/components/InfoPage';

export const metadata = {
  title: 'تواصل معنا — Contact Juthoor',
  description: 'Get in touch with the Palestinian Roots Platform — questions, partnerships, and support.',
};

const CONTENT: InfoPageContent = {
  kickerAr: 'تواصل',
  kickerEn: 'Contact',
  titleAr: 'تواصل معنا',
  titleEn: 'Contact us',
  leadAr: 'أسئلة، شراكات، أو دعم — يسعدنا أن نسمع منك.',
  leadEn: 'Questions, partnerships, or support — we’d love to hear from you.',
  sections: [
    {
      hAr: 'راسلنا',
      hEn: 'Email us',
      bodyAr: [
        'للأسئلة العامّة والدعم: hello@juthoor.app',
        'لمسائل الخصوصية وبياناتك: privacy@juthoor.app',
        'للمسائل القانونية: legal@juthoor.app',
      ],
      bodyEn: [
        'General questions and support: hello@juthoor.app',
        'Privacy and your data: privacy@juthoor.app',
        'Legal matters: legal@juthoor.app',
      ],
    },
    {
      hAr: 'شراكات',
      hEn: 'Partnerships',
      bodyAr: [
        'نرحّب بالجامعات والأرشيفات والجمعيّات والروابط العائليّة التي تشاركنا الرسالة: توثيق الشعب الفلسطيني وحفظ ذاكرته. تواصل معنا على hello@juthoor.app.',
      ],
      bodyEn: [
        'We welcome universities, archives, associations, and family networks that share the mission: documenting the Palestinian people and preserving their memory. Reach us at hello@juthoor.app.',
      ],
    },
  ],
  ctaAr: 'راسلنا الآن',
  ctaEn: 'Email us',
  ctaHref: 'mailto:hello@juthoor.app',
};

export default function ContactPage() {
  return <InfoPage content={CONTENT} />;
}
