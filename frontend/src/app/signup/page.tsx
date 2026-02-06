import { Suspense } from 'react';
import SignupClient from './SignupClient';

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
          <div className="text-sm text-neutral-600">Loading…</div>
        </div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}
