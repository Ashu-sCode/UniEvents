'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  Calendar,
  Camera,
  CheckCircle2,
  Mail,
  Phone,
  Save,
  Shield,
  Ticket,
  Upload,
  UserCircle2,
  Users,
} from 'lucide-react';
import { AsyncImage, Button, Card, Input, ProfileFormSkeleton } from '@/components/ui';
import { attendanceAPI, certificatesAPI, eventsAPI, ticketsAPI, usersAPI } from '@/lib/api';
import { formatDate, getImageUrl, isValidImageType } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLoading } from '@/context/LoadingContext';
import type { User } from '@/types';
import { STREAM_OPTIONS } from '@/constants/streams';

type FormState = {
  name: string;
  phone: string;
  department: string;
};

type ProfileStats = {
  primary: Array<{ label: string; value: number | string; helper: string }>;
  secondary: Array<{ label: string; value: string; helper: string }>;
  actions: Array<{ label: string; href: string }>;
};

export default function ProfileForm() {
  const router = useRouter();
  const { updateUser } = useAuth();
  const toast = useToast();
  const { showGlobalLoader, hideGlobalLoader } = useLoading();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    department: '',
  });

  const avatarUrl = photoPreview || getImageUrl(user?.profilePhotoUrl);
  const joinedDate = user?.createdAt ? formatDate(user.createdAt, { weekday: undefined, month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently joined';

  const roleLabel = user?.role === 'organizer' ? 'Organizer account' : 'Student account';
  const roleDescription = user?.role === 'organizer'
    ? 'Manage your events, registrations, attendance, and analytics from here.'
    : 'Track your registrations, attendance, certificates, and academic stream details.';

  const accountBadge = useMemo(() => {
    if (!user) return '';
    return user.role === 'organizer' ? 'Organizer' : 'Student';
  }, [user]);

  const buildStats = async (nextUser: User) => {
    if (nextUser.role === 'organizer') {
      const eventsRes = await eventsAPI.getAll();
      const events = eventsRes.data.data.events || [];
      const totalRegistrations = events.reduce((sum, event) => sum + (event.registeredCount || 0), 0);

      return {
        primary: [
          {
            label: 'Total Events',
            value: events.length,
            helper: 'All events created under this account',
          },
          {
            label: 'Published',
            value: events.filter((event) => event.status === 'published').length,
            helper: 'Currently open for registrations',
          },
          {
            label: 'Registrations',
            value: totalRegistrations,
            helper: 'Combined confirmed registrations',
          },
        ],
        secondary: [
          {
            label: 'Completed Events',
            value: String(events.filter((event) => event.status === 'completed').length),
            helper: 'Events finished and ready for reports',
          },
          {
            label: 'Department Focus',
            value: nextUser.department,
            helper: 'Default stream used for organizer profile',
          },
        ],
        actions: [
          { label: 'Open Organizer Dashboard', href: '/dashboard/organizer' },
          { label: 'View Analytics', href: '/dashboard/organizer/analytics' },
        ],
      } satisfies ProfileStats;
    }

    const [ticketsRes, certificatesRes, attendanceRes] = await Promise.all([
      ticketsAPI.getMyTickets(),
      certificatesAPI.getMyCertificates(),
      attendanceAPI.getMyAttendance(),
    ]);

    const tickets = ticketsRes.data.data.tickets || [];
    const certificates = certificatesRes.data.data.certificates || [];
    const attendance = attendanceRes.data.data.attendance || [];

    return {
      primary: [
        {
          label: 'Active Tickets',
          value: tickets.filter((ticket) => ticket.status === 'unused' || ticket.status === 'waitlisted').length,
          helper: 'Upcoming confirmed or waitlisted event entries',
        },
        {
          label: 'Certificates',
          value: certificates.length,
          helper: 'Issued certificates available to download',
        },
        {
          label: 'Attendance',
          value: attendance.length,
          helper: 'Events where your attendance was marked',
        },
      ],
      secondary: [
        {
          label: 'Roll Number',
          value: nextUser.rollNumber || 'Not added',
          helper: 'Used to identify your student registration',
        },
        {
          label: 'Academic Stream',
          value: nextUser.department,
          helper: 'Used for departmental event eligibility',
        },
      ],
      actions: [
        { label: 'Go To My Tickets', href: '/dashboard/student?tab=tickets' },
        { label: 'Open Certificates', href: '/dashboard/student?tab=certificates' },
      ],
    } satisfies ProfileStats;
  };

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await usersAPI.getMe();
      const nextUser = res.data?.data?.user as User;
      setUser(nextUser);
      setForm({
        name: nextUser?.name || '',
        phone: nextUser?.phone || '',
        department: nextUser?.department || '',
      });
      updateUser(nextUser);

      const nextStats = await buildStats(nextUser);
      setStats(nextStats);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isValidImageType(file)) {
      toast.error('Please choose a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Profile photo must be smaller than 5MB.');
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    showGlobalLoader();

    const previousUser = user;
    const optimisticUser: User | null = user
      ? {
          ...user,
          name: form.name,
          phone: form.phone || null,
          department: form.department,
        }
      : null;

    if (optimisticUser) {
      setUser(optimisticUser);
      updateUser(optimisticUser);
    }

    try {
      const hasPhotoUpload = Boolean(photoFile);
      const payload = hasPhotoUpload ? new FormData() : {
        name: form.name,
        phone: form.phone,
        department: form.department,
      };

      if (payload instanceof FormData) {
        payload.append('name', form.name);
        payload.append('phone', form.phone);
        payload.append('department', form.department);
        payload.append('photo', photoFile as File);
      }

      const res = await usersAPI.updateMe(payload);
      const updated = res.data?.data?.user as User;

      setUser(updated);
      updateUser(updated);
      setPhotoFile(null);
      setPhotoPreview(null);
      setStats(await buildStats(updated));
      toast.success('Profile updated successfully');
    } catch (err: any) {
      if (previousUser) {
        setUser(previousUser);
        updateUser(previousUser);
      }
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      hideGlobalLoader();
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl">
        <ProfileFormSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#334155_100%)] p-0 text-white shadow-xl" hover={false}>
        <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[auto,1fr,auto] lg:items-center">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-3xl border border-white/15 bg-white/10">
              {avatarUrl ? (
                <AsyncImage
                  src={avatarUrl}
                  alt={user?.name || 'Profile photo'}
                  className="h-full w-full object-cover"
                  fallback={<div className="flex h-full w-full items-center justify-center"><UserCircle2 className="h-12 w-12 text-white/70" /></div>}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <UserCircle2 className="h-12 w-12 text-white/70" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 rounded-2xl border border-white/20 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100"
            >
              <span className="flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" />
                Photo
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoChange}
              disabled={isSaving}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold">{user?.name}</h2>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                {accountBadge}
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-200">{roleDescription}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Mail className="h-4 w-4" />
                {user?.email}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Calendar className="h-4 w-4" />
                Joined {joinedDate}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <Shield className="h-4 w-4" />
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[16rem]">
            {stats?.primary.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                <p className="text-2xl font-semibold">{item.value}</p>
                <p className="mt-1 text-sm text-slate-200">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.25fr,0.75fr]">
        <Card className="p-6 sm:p-8" hover={false}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-neutral-900">Edit Profile</h3>
              <p className="mt-1 text-sm text-neutral-600">
                Keep your account details current so registrations, attendance, and notifications stay accurate.
              </p>
            </div>
            {photoFile && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                New photo ready to upload
              </span>
            )}
          </div>

          <form onSubmit={onSubmit} className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Full Name"
              value={form.name}
              disabled={isSaving}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Your full name"
              required
            />

            <Input
              label="Phone Number"
              value={form.phone}
              disabled={isSaving}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+91 9XXXXXXXXX"
            />

            <div>
              <label className="label">Stream / Department</label>
              <select
                value={form.department}
                disabled={isSaving}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                className="input"
                required
              >
                {form.department && !STREAM_OPTIONS.some((stream) => stream.value === form.department) && (
                  <option value={form.department}>{form.department}</option>
                )}
                <option value="">Select Department</option>
                {STREAM_OPTIONS.map((stream) => (
                  <option key={stream.value} value={stream.value}>
                    {stream.label}
                  </option>
                ))}
              </select>
            </div>

            <Input label="Email Address" value={user?.email || ''} disabled />

            <Input label="Account Type" value={accountBadge} disabled />

            {user?.role === 'student' ? (
              <Input label="Roll Number" value={user?.rollNumber || 'Not added'} disabled />
            ) : (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-900">Organizer Tip</p>
                <p className="mt-2 text-sm text-neutral-600">
                  Your department helps personalize defaults and event context, but you can still create public and cross-stream events.
                </p>
              </div>
            )}

            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-5">
              <div className="inline-flex items-center gap-2 text-sm text-neutral-500">
                <Upload className="h-4 w-4" />
                Photo uploads and profile details save together.
              </div>
              <Button type="submit" isLoading={isSaving} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="p-6" hover={false}>
            <h3 className="text-lg font-semibold text-neutral-900">Account Snapshot</h3>
            <div className="mt-4 space-y-4">
              {stats?.secondary.map((item) => (
                <div key={item.label} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-neutral-700">{item.label}</p>
                    <p className="text-sm font-semibold text-neutral-900">{item.value}</p>
                  </div>
                  <p className="mt-2 text-sm text-neutral-500">{item.helper}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6" hover={false}>
            <h3 className="text-lg font-semibold text-neutral-900">Quick Actions</h3>
            <div className="mt-4 space-y-3">
              {stats?.actions.map((action) => (
                <button
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-left transition hover:bg-neutral-50"
                >
                  <div className="flex items-center gap-3">
                    {action.href.includes('analytics') ? (
                      <Users className="h-4 w-4 text-neutral-500" />
                    ) : action.href.includes('certificates') ? (
                      <Award className="h-4 w-4 text-neutral-500" />
                    ) : action.href.includes('tickets') ? (
                      <Ticket className="h-4 w-4 text-neutral-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-neutral-500" />
                    )}
                    <span className="text-sm font-medium text-neutral-800">{action.label}</span>
                  </div>
                  <span className="text-xs text-neutral-500">Open</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6" hover={false}>
            <h3 className="text-lg font-semibold text-neutral-900">Why This Matters</h3>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Accurate profile details improve departmental event access, organizer visibility, attendance records,
              and certificate generation. This page is now your central account summary instead of just a small edit form.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
