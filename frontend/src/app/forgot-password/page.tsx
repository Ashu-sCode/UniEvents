'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Ticket } from 'lucide-react';

import { useApi } from '@/hooks/useApi';
import { authAPI } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Button, Card } from '@/components/ui';

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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center space-x-2.5 group">
            <Ticket className="h-9 w-9 text-neutral-700 group-hover:text-neutral-900 transition-colors" />
            <span className="text-2xl font-semibold text-neutral-900">UniEvent</span>
          </Link>
          <p className="mt-3 text-neutral-600">Reset your password</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@university.edu"
                required
              />
            </div>

            <Button type="submit" isLoading={isLoading} className="w-full mt-6">
              {isLoading ? 'Sending link...' : 'Send reset link'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            Remembered your password?{' '}
            <Link href="/login" className="text-neutral-900 hover:text-neutral-700 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
