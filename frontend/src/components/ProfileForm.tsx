'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Card, Input, ProfileFormSkeleton } from '@/components/ui';
import { usersAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useLoading } from '@/context/LoadingContext';
import type { User } from '@/types';

type FormState = {
  name: string;
  phone: string;
  department: string;
};

export default function ProfileForm() {
  const { updateUser } = useAuth();
  const toast = useToast();
  const { showGlobalLoader, hideGlobalLoader } = useLoading();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    department: '',
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await usersAPI.getMe();
      const u = res.data?.data?.user as User;
      setUser(u);
      setForm({
        name: u?.name || '',
        phone: (u?.phone as any) || '',
        department: u?.department || '',
      });
      updateUser(u);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);
    showGlobalLoader();

    // Optimistic update (rollback on failure)
    const previousUser = user;
    const optimisticUser: User | null = user
      ? { ...user, name: form.name, phone: form.phone, department: form.department }
      : null;

    if (optimisticUser) {
      setUser(optimisticUser);
      updateUser(optimisticUser);
    }

    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        department: form.department,
      };

      const res = await usersAPI.updateMe(payload);
      const updated = res.data?.data?.user as User;

      setUser(updated);
      updateUser(updated);
      toast.success('Profile updated successfully');
    } catch (err: any) {
      // rollback
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
      <div className="max-w-3xl">
        <ProfileFormSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-6 sm:p-8" hover={false}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Profile</h2>
            <p className="text-sm text-neutral-600 mt-1">
              Update your personal details.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            label="Name"
            value={form.name}
            disabled={isLoading || isSaving}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Your name"
            required
          />

          <Input
            label="Phone (optional)"
            value={form.phone}
            disabled={isLoading || isSaving}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+91 9XXXXXXXXX"
          />

          <Input
            label="Department"
            value={form.department}
            disabled={isLoading || isSaving}
            onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
            placeholder="Computer Science"
            required
          />

          <Input
            label="Email (read-only)"
            value={user?.email || ''}
            disabled
          />

          <Input
            label="Role (read-only)"
            value={user?.role || ''}
            disabled
          />

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" isLoading={isSaving} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
