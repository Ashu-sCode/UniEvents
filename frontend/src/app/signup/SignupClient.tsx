'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, FileBadge2, KeyRound, Mail, User, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { STREAM_OPTIONS } from '@/constants/streams';

export default function SignupClient() {
  const searchParams = useSearchParams();
  const initialRole = (searchParams.get('role') as 'student' | 'organizer') || 'student';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    rollNumber: '',
    department: '',
    role: initialRole,
    idCard: null as File | null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signup(formData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleCopy = formData.role === 'student'
    ? 'Student access opens after admin approval. Upload your campus ID card so tickets, registrations, and certificates stay protected from fake accounts.'
    : 'Organizer access opens after admin approval. Your request will be reviewed before event creation, scanning, and analytics tools are unlocked.';

  return (
    <AuthShell
      eyebrow="Create Account"
      title="Set up your UniEvent account in a few guided steps."
      description="Choose the role that matches your campus work, add your stream details, and start using the dashboard built for you."
      sideTitle="Start with the role that fits your event journey."
      sideDescription="Students get smooth discovery, registration, and certificate tracking. Organizers get operational tools for publishing, verification, waitlists, and event performance."
      highlights={[
        'Student accounts unlock tickets, waitlists, notifications, and certificates.',
        'Organizer accounts unlock event creation, QR verification, and analytics.',
        'Your stream information helps personalize access to departmental events.',
      ]}
      footer={(
        <p>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-neutral-950 hover:text-neutral-700">
            Sign in
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5" aria-describedby={error ? 'signup-error' : undefined}>
        {error && (
          <div id="signup-error" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="label">Choose your role</label>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account role">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'student' })}
              aria-pressed={formData.role === 'student'}
              className={cn(
                'rounded-2xl border-2 p-4 text-left transition-all',
                formData.role === 'student'
                  ? 'border-neutral-900 bg-neutral-50 text-neutral-950'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
              )}
            >
              <div className="flex items-center gap-2 font-medium">
                <User className="h-5 w-5" aria-hidden="true" />
                Student
              </div>
              <p className="mt-2 text-sm text-neutral-600">Browse, register, and manage your event journey.</p>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, role: 'organizer' })}
              aria-pressed={formData.role === 'organizer'}
              className={cn(
                'rounded-2xl border-2 p-4 text-left transition-all',
                formData.role === 'organizer'
                  ? 'border-neutral-900 bg-neutral-50 text-neutral-950'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
              )}
            >
              <div className="flex items-center gap-2 font-medium">
                <Users className="h-5 w-5" aria-hidden="true" />
                Organizer
              </div>
              <p className="mt-2 text-sm text-neutral-600">Create, run, and evaluate campus events.</p>
            </button>
          </div>
          <p className="mt-3 text-sm text-neutral-600">{roleCopy}</p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          {formData.role === 'student'
            ? 'Students must upload a valid campus ID card and wait for admin approval before using the dashboard.'
            : 'Organizers must wait for admin approval before event operations and ticket verification tools become available.'}
        </div>

        <div>
          <label htmlFor="name" className="label">Full Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            className="input"
            placeholder="Your full name"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="label">Email Address</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="input pl-10"
              placeholder="you@university.edu"
              autoComplete="email"
              required
            />
          </div>
        </div>

        {formData.role === 'student' && (
          <>
            <div>
              <label htmlFor="rollNumber" className="label">Roll Number</label>
              <input
                id="rollNumber"
                name="rollNumber"
                type="text"
                value={formData.rollNumber}
                onChange={handleChange}
                className="input"
                placeholder="BCA-001 or similar"
                required
              />
            </div>

            <div>
              <label htmlFor="idCard" className="label">Student ID Card</label>
              <div className="relative">
                <FileBadge2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
                <input
                  id="idCard"
                  name="idCard"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="input pl-10 file:mr-3 file:rounded-xl file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      idCard: event.target.files?.[0] || null,
                    }))
                  }
                  required
                />
              </div>
              <p className="mt-2 text-xs text-neutral-500">Upload a clear image of your college ID card. This is reviewed by admin before approval.</p>
            </div>
          </>
        )}

        <div>
          <label htmlFor="department" className="label">Stream / Department</label>
          <select
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="input"
            required
          >
            <option value="">Select Department</option>
            {STREAM_OPTIONS.map((stream) => (
              <option key={stream.value} value={stream.value}>
                {stream.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              className="input pl-10 pr-12"
              placeholder="Create a secure password"
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

        <Button type="submit" isLoading={isLoading} className="w-full py-3 text-base">
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
    </AuthShell>
  );
}
