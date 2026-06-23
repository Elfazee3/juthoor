import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { TERMS_AND_CONDITIONS } from '@/lib/legal/termsContent';

export const metadata = {
  title: 'الشروط والأحكام — Terms & Conditions | Juthoor',
  description:
    'The rules that govern use of the Palestinian Roots Platform — eligibility, accounts, access rights, content, and more.',
};

export default function TermsPage() {
  return <LegalDocumentView doc={TERMS_AND_CONDITIONS} />;
}
