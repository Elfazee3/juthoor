import { getMyVerification } from '@/data/user/identityVerification';
import { VerifyClient } from './VerifyClient';

export const metadata = {
  title: 'توثيق الهوية — Verify identity | Juthoor',
  description:
    'Verify your identity and your belonging to a family to gain write access to its tree.',
};

export default async function VerifyPage() {
  const verification = await getMyVerification().catch(() => null);
  return <VerifyClient initialVerification={verification} />;
}
