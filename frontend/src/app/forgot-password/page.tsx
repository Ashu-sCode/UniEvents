'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ShieldCheck } from 'lucide-react';

import { useApi } from '@/hooks/useApi';
import { authAPI } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';

export default function ForgotPasswordPage() {
  const api = useApi();
  const toast = useToast();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await api.run(() => authAPI.forgotPassword({ email }), {
      successMessage: 'If the account exists, a reset link has been sent to your email.',
      errorMessage: (err) => err?.response?.data?.message || 'Failed to request password reset',
    });

    setIsLoading(false);
    toast.info('Check your email for the reset link.');
  };

  return (
    <AuthShell
      eyebrow="Password Recovery"
      title="Reset your password without losing access to your event activity."
      description="Enter the email linked to your UniEvent account. If it exists, we will send a reset link so you can regain access securely."
      sideTitle="Account recovery should feel simple and safe."
      sideDescription="This flow helps both students and organizers recover access while keeping account existence private and maintaining role-based security."
      highlights={[
        'Works for both student and organizer accounts.',
        'Protects account privacy with a generic confirmation response.',
        'Lets you get back to tickets, registrations, analytics, and notifications quickly.',
      ]}
      footer={(
        <p>
          Remembered your password?{' '}
          <Link href="/login" className="font-medium text-neutral-950 hover:text-neutral-700">
            Sign in
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">Email Address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-10"
              placeholder="you@university.edu"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" aria-hidden="true" />
            <p>For security, we show the same confirmation whether or not the email exists in the system.</p>
          </div>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full py-3 text-base">
          {isLoading ? 'Sending link...' : 'Send Reset Link'}
        </Button>
      </form>
    </AuthShell>
  );
}
