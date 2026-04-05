'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/context/AuthContext';
import { getDashboardRoute, isApprovedUser, isReviewState } from '@/lib/authState';
import type { UserRole } from '@/types';

export function useRequireAuthRole(role: UserRole) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const approved = isApprovedUser(user);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (isReviewState(user)) {
      router.replace('/account-status');
      return;
    }

    if (!approved) {
      router.replace('/login');
      return;
    }

    if (user.role !== role) {
      router.replace(getDashboardRoute(user.role));
    }
  }, [approved, isLoading, role, router, user]);

  return {
    isReady: Boolean(user && approved && !isLoading && user.role === role),
    user,
    isLoading,
  };
}
