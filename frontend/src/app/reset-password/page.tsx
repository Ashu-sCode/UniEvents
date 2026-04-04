'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';

import { useApi } from '@/hooks/useApi';
import { authAPI } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';

export default function ResetPasswordPage() {
  const router = useRouter();
  const api = useApi();
  const toast = useToast();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Missing reset token. Please use the link from your email.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    const res = await api.run(() => authAPI.resetPassword(token, { password }), {
      successMessage: 'Password reset successful. You can now sign in.',
      errorMessage: (err) => err?.response?.data?.message || 'Failed to reset password',
    });

    setIsLoading(false);

    if (res) {
      router.push('/login');
    }
  };

  return (
    <AuthShell
      eyebrow="Set New Password"
      title="Choose a fresh password and return to your account securely."
      description="Use the reset link from your email to set a new password for your UniEvent account."
      sideTitle="Secure access for your event workflow."
      sideDescription="A successful reset gets you back to your account without losing your registrations, event operations, notifications, or reporting context."
      highlights={[
        'Students keep access to tickets, attendance, and certificates.',
        'Organizers keep access to events, waitlists, and dashboard tools.',
        'Password validation helps reduce accidental mistakes during recovery.',
      ]}
      footer={(
        <p>
          Back to{' '}
          <Link href="/login" className="font-medium text-neutral-950 hover:text-neutral-700">
            Sign in
          </Link>
        </p>
      )}
    >
      {!token ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          Reset token is missing or invalid.{' '}
          <Link href="/forgot-password" className="font-medium text-amber-900 underline decoration-amber-300 underline-offset-4">
            Request a new reset link
          </Link>
          .
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="label">New Password</label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10 pr-12"
                placeholder="Enter a new password"
                minLength={6}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-neutral-500 transition-colors hover:text-neutral-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm" className="label">Confirm Password</label>
            <input
              id="confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input"
              placeholder="Re-enter the new password"
              minLength={6}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" aria-hidden="true" />
              <p>Choose a password with at least 6 characters so you can get back into your account smoothly.</p>
            </div>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full py-3 text-base">
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
