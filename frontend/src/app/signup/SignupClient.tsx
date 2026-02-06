'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Ticket, Eye, EyeOff, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button, Card } from '@/components/ui';

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

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center space-x-2.5 group">
            <Ticket className="h-9 w-9 text-neutral-700 group-hover:text-neutral-900 transition-colors" />
            <span className="text-2xl font-semibold text-neutral-900">UniEvent</span>
          </Link>
          <p className="mt-3 text-neutral-600">Create your account</p>
        </div>

        {/* Signup Form */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100">
                {error}
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'student' })}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all',
                    formData.role === 'student'
                      ? 'border-neutral-800 bg-neutral-50 text-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-300'
                  )}
                >
                  <User className="h-5 w-5" />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'organizer' })}
                  className={cn(
                    'flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all',
                    formData.role === 'organizer'
                      ? 'border-neutral-800 bg-neutral-50 text-neutral-900'
                      : 'border-neutral-200 hover:border-neutral-300'
                  )}
                >
                  <Users className="h-5 w-5" />
                  Organizer
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="label">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="you@university.edu"
                required
              />
            </div>

            {formData.role === 'student' && (
              <div>
                <label htmlFor="rollNumber" className="label">
                  Roll Number
                </label>
                <input
                  id="rollNumber"
                  name="rollNumber"
                  type="text"
                  value={formData.rollNumber}
                  onChange={handleChange}
                  className="input"
                  placeholder="2024CSE001"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="department" className="label">
                Department
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select Department</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Electrical Engineering">Electrical Engineering</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="Electronics">Electronics</option>
                <option value="Information Technology">Information Technology</option>
                <option value="MBA">MBA</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
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

            <Button type="submit" isLoading={isLoading} className="w-full mt-6">
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            Already have an account?{' '}
            <Link href="/login" className="text-neutral-900 hover:text-neutral-700 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
