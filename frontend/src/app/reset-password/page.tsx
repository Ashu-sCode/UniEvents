'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ticket, Eye, EyeOff } from 'lucide-react';

import { useApi } from '@/hooks/useApi';
import { authAPI } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Button, Card } from '@/components/ui';

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
    const t = params.get('token');
    setToken(t);
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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center space-x-2.5 group">
            <Ticket className="h-9 w-9 text-neutral-700 group-hover:text-neutral-900 transition-colors" />
            <span className="text-2xl font-semibold text-neutral-900">UniEvent</span>
          </Link>
          <p className="mt-3 text-neutral-600">Set a new password</p>
        </div>

        <Card>
          {!token ? (
            <div className="text-sm text-neutral-700">
              <p>Reset token is missing or invalid.</p>
              <p className="mt-3">
                <Link href="/forgot-password" className="text-neutral-900 hover:text-neutral-700 font-medium">
                  Request a new reset link
                </Link>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="label">New Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="••••••••"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              <Button type="submit" isLoading={isLoading} className="w-full mt-6">
                {isLoading ? 'Resetting...' : 'Reset password'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-neutral-600">
            Back to{' '}
            <Link href="/login" className="text-neutral-900 hover:text-neutral-700 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
