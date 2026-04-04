'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome Back"
      title="Sign in to continue managing or attending campus events."
      description="Access your dashboard, tickets, waitlist updates, attendance records, certificates, and notifications from one secure account."
      sideTitle="Pick up where your event journey left off."
      sideDescription="Students can resume registrations and ticket access. Organizers can return to event operations, analytics, and attendee management without losing context."
      highlights={[
        'Students can reopen tickets, certificates, and waitlist updates instantly.',
        'Organizers can resume scanning, event edits, notifications, and reporting.',
        'Role-based access keeps operational tools and student actions clearly separated.',
      ]}
      footer={(
        <p>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-neutral-950 hover:text-neutral-700">
            Sign up
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={error ? 'login-error' : undefined}>
        {error && (
          <div id="login-error" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">
            Email Address
          </label>
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

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="label">
              Password
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-neutral-700 hover:text-neutral-950">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-10 pr-12"
              placeholder="Enter your password"
              autoComplete="current-password"
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

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neutral-600" aria-hidden="true" />
            <p>Use the same account you created for either student participation or organizer event management.</p>
          </div>
        </div>

        <Button type="submit" isLoading={isLoading} className="mt-2 w-full py-3 text-base">
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </AuthShell>
  );
}
