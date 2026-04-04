import { Suspense } from 'react';
import SignupClient from './SignupClient';
import { PageLoader } from '@/components/ui';

export default function SignupPage() {
  return (
    <Suspense fallback={<PageLoader title="Loading signup" message="Preparing the registration form." />}>
      <SignupClient />
    </Suspense>
  );
}
