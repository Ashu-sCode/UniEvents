import type { ApprovalStatus, User } from '@/types';

export function isApprovedUser(user: User | null | undefined): boolean {
  return Boolean(user && user.approvalStatus === 'approved' && user.isActive !== false);
}

export function isReviewState(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.approvalStatus === 'pending' || user.approvalStatus === 'rejected';
}

export function getDashboardRoute(role: User['role']): string {
  switch (role) {
    case 'admin':
      return '/dashboard/admin';
    case 'organizer':
      return '/dashboard/organizer';
    case 'student':
    default:
      return '/dashboard/student';
  }
}

export function getPostAuthRoute(user: User): string {
  if (!isApprovedUser(user)) {
    return '/account-status';
  }
  return getDashboardRoute(user.role);
}

export function getApprovalLabel(status: ApprovalStatus): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'pending':
    default:
      return 'Pending review';
  }
}
