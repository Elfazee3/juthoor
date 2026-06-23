import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import { PRIVACY_POLICY } from '@/lib/legal/privacyContent';

export const metadata = {
  title: 'سياسة الخصوصية — Privacy Policy | Juthoor',
  description:
    'How the Palestinian Roots Platform collects, uses, protects, and respects your personal and genealogical information.',
};

export default function PrivacyPage() {
  return <LegalDocumentView doc={PRIVACY_POLICY} />;
}
