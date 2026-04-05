'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Download,
  Eye,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserX,
  X,
} from 'lucide-react';

import { DashboardNavbar } from '@/components/DashboardNavbar';
import { Button, PageLoader } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { useRequireAuthRole } from '@/hooks/useRequireAuthRole';
import { adminAPI } from '@/lib/api';
import { cn, downloadBlob, formatDate } from '@/lib/utils';
import type { AdminSummary, AdminUserReview, ApprovalStatus, UserRole } from '@/types';

type Filters = {
  role: 'all' | UserRole;
  approvalStatus: 'all' | ApprovalStatus;
  search: string;
};

const defaultFilters: Filters = {
  role: 'all',
  approvalStatus: 'all',
  search: '',
};

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function canModerateUser(user: AdminUserReview) {
  return user.role !== 'admin';
}

function canApproveUser(user: AdminUserReview) {
  return canModerateUser(user) && user.approvalStatus !== 'approved';
}

function canRejectUser(user: AdminUserReview) {
  return canModerateUser(user) && user.approvalStatus === 'pending';
}

function canToggleActiveUser(user: AdminUserReview) {
  return canModerateUser(user) && user.approvalStatus === 'approved';
}

export default function AdminDashboardPage() {
  const { isReady } = useRequireAuthRole('admin');
  const toast = useToast();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUserReview[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUserReview | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [idCardPreviewUrl, setIdCardPreviewUrl] = useState<string | null>(null);
  const [rejectingUser, setRejectingUser] = useState<AdminUserReview | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAdminData = async (requestedPage = page, activeFilters = filters) => {
    setIsLoading(true);
    try {
      const [summaryResponse, usersResponse] = await Promise.all([
        adminAPI.getSummary(),
        adminAPI.getUsers({
          page: requestedPage,
          limit: 10,
          role: activeFilters.role,
          approvalStatus: activeFilters.approvalStatus,
          search: activeFilters.search || undefined,
        }),
      ]);

      setSummary(summaryResponse.data.data.summary);
      setUsers(usersResponse.data.data.users);
      setPage(usersResponse.data.page || 1);
      setTotalPages(usersResponse.data.totalPages || 1);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Failed to load admin dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      void loadAdminData(1, filters);
    }
  }, [isReady]);

  const handleApprove = async (userId: string) => {
    setIsSubmitting(true);
    try {
      const response = await adminAPI.approveUser(userId);
      toast.success('Account approved successfully');
      if (selectedUser?.id === userId) {
        setSelectedUser(response.data.data.user);
      }
      await loadAdminData(page, filters);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Failed to approve account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingUser) return;
    setIsSubmitting(true);
    try {
      const response = await adminAPI.rejectUser(rejectingUser.id, rejectionReason);
      toast.success('Account rejected');
      if (selectedUser?.id === rejectingUser.id) {
        setSelectedUser(response.data.data.user);
      }
      setRejectingUser(null);
      setRejectionReason('');
      await loadAdminData(page, filters);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Failed to reject account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openIdCard = async (userId: string, fileName: string, download = false) => {
    try {
      const response = await adminAPI.getUserIdCard(userId);
      const blob = response.data;

      if (download) {
        downloadBlob(blob, `${fileName}-id-card`);
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Unable to open ID card');
    }
  };

  const loadUserDetail = async (userId: string) => {
    setIsDetailLoading(true);
    try {
      const response = await adminAPI.getUser(userId);
      setSelectedUser(response.data.data.user);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Unable to load user details');
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    let disposed = false;

    const loadPreview = async () => {
      if (!selectedUser?.hasIdCard) {
        setIdCardPreviewUrl(null);
        return;
      }

      try {
        const response = await adminAPI.getUserIdCard(selectedUser.id);
        const objectUrl = URL.createObjectURL(response.data);
        if (disposed) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setIdCardPreviewUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return objectUrl;
        });
      } catch {
        setIdCardPreviewUrl(null);
      }
    };

    void loadPreview();

    return () => {
      disposed = true;
    };
  }, [selectedUser?.id, selectedUser?.hasIdCard]);

  useEffect(() => () => {
    if (idCardPreviewUrl) {
      URL.revokeObjectURL(idCardPreviewUrl);
    }
  }, [idCardPreviewUrl]);

  const handleToggleActiveState = async (user: AdminUserReview) => {
    setIsSubmitting(true);
    try {
      const response = await adminAPI.updateUserActiveState(user.id, !user.isActive);
      const updatedUser = response.data.data.user;
      toast.success(updatedUser.isActive ? 'Account reactivated' : 'Account deactivated');
      setSelectedUser(updatedUser);
      await loadAdminData(page, filters);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Failed to update account status');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return <PageLoader title="Preparing admin workspace" />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0%,transparent_24%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_45%,#f8fafc_100%)]">
      <DashboardNavbar role="admin" title="Admin Control Center" subtitle="Review new accounts and protect access before events go live" />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[2rem] bg-[linear-gradient(160deg,#0f172a_0%,#111827_45%,#16352b_100%)] p-6 text-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] sm:p-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
              <ShieldCheck className="h-4 w-4" />
              Access Governance
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl">
              Approve real students and verified organizers before they enter the system.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
              This workspace controls who can create events, scan tickets, register for seats, and access certificates. Student IDs are reviewed here before participation is unlocked.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Pending students" value={summary?.pendingStudents || 0} />
          <MetricCard label="Pending organizers" value={summary?.pendingOrganizers || 0} />
          <MetricCard label="Approved users" value={summary?.approvedUsers || 0} />
          <MetricCard label="Rejected users" value={summary?.rejectedUsers || 0} />
          <MetricCard label="Admins" value={summary?.admins || 0} />
        </section>

        <section className="mt-8 rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-neutral-950">Review queue</h2>
              <p className="mt-1 text-sm text-neutral-500">Filter by role, approval stage, or search by name, email, or roll number.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Search users"
                  className="h-12 rounded-2xl border border-neutral-200 bg-neutral-50 pl-10 pr-4 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
                />
              </label>
              <select
                value={filters.role}
                onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value as Filters['role'] }))}
                className="h-12 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
              >
                <option value="all">All roles</option>
                <option value="student">Students</option>
                <option value="organizer">Organizers</option>
                <option value="admin">Admins</option>
              </select>
              <select
                value={filters.approvalStatus}
                onChange={(event) => setFilters((current) => ({ ...current, approvalStatus: event.target.value as Filters['approvalStatus'] }))}
                className="h-12 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Button
                onClick={() => {
                  setPage(1);
                  void loadAdminData(1, filters);
                }}
                className="h-12 px-5"
              >
                Apply filters
              </Button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              <PageLoader title="Loading review queue" />
            ) : users.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-neutral-200 bg-neutral-50 px-6 py-10 text-center">
                <p className="text-lg font-semibold text-neutral-900">No accounts match the current filters.</p>
                <p className="mt-2 text-sm text-neutral-500">Try broadening the search or switching to a different approval status.</p>
              </div>
            ) : (
              users.map((reviewUser) => (
                <article key={reviewUser.id} className="rounded-[1.6rem] border border-neutral-200 bg-neutral-50/80 p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-neutral-950">{reviewUser.name}</h3>
                        <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-600">
                          {reviewUser.role}
                        </span>
                        <span className={cn(
                          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                          reviewUser.approvalStatus === 'approved'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : reviewUser.approvalStatus === 'rejected'
                              ? 'border border-rose-200 bg-rose-50 text-rose-700'
                              : 'border border-amber-200 bg-amber-50 text-amber-700'
                        )}>
                          {reviewUser.approvalStatus}
                        </span>
                        <span className={cn(
                          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
                          reviewUser.isActive
                            ? 'border border-sky-200 bg-sky-50 text-sky-700'
                            : 'border border-neutral-300 bg-neutral-100 text-neutral-600'
                        )}>
                          {reviewUser.isActive ? 'active' : 'inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600">{reviewUser.email}</p>
                      <div className="flex flex-wrap gap-2 text-sm text-neutral-600">
                        <span className="rounded-full bg-white px-3 py-1">{reviewUser.department}</span>
                        {reviewUser.rollNumber ? <span className="rounded-full bg-white px-3 py-1">{reviewUser.rollNumber}</span> : null}
                        <span className="rounded-full bg-white px-3 py-1">
                          ID card: {reviewUser.hasIdCard ? 'available' : 'not uploaded'}
                        </span>
                      </div>
                      {reviewUser.rejectionReason ? (
                        <p className="max-w-2xl text-sm leading-7 text-rose-700">
                          Last rejection reason: {reviewUser.rejectionReason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => void loadUserDetail(reviewUser.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                      >
                        <UserCog className="h-4 w-4" />
                        Open details
                      </button>
                      {reviewUser.hasIdCard ? (
                        <>
                          <button
                            onClick={() => void openIdCard(reviewUser.id, reviewUser.name)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                          >
                            <Eye className="h-4 w-4" />
                            View ID
                          </button>
                          <button
                            onClick={() => void openIdCard(reviewUser.id, reviewUser.name, true)}
                            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </>
                      ) : null}
                      {canApproveUser(reviewUser) ? (
                        <button
                          onClick={() => void handleApprove(reviewUser.id)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-2 rounded-2xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
                        >
                          <UserCheck className="h-4 w-4" />
                          Approve
                        </button>
                      ) : null}
                      {canRejectUser(reviewUser) ? (
                        <button
                          onClick={() => {
                            setRejectingUser(reviewUser);
                            setRejectionReason(reviewUser.rejectionReason || '');
                          }}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          <UserX className="h-4 w-4" />
                          Reject
                        </button>
                      ) : null}
                      {canToggleActiveUser(reviewUser) ? (
                        <button
                          onClick={() => void handleToggleActiveState(reviewUser)}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          {reviewUser.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-neutral-500">Page {page} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => void loadAdminData(Math.max(1, page - 1), filters)} disabled={page <= 1}>
                Previous
              </Button>
              <Button variant="secondary" onClick={() => void loadAdminData(Math.min(totalPages, page + 1), filters)} disabled={page >= totalPages}>
                Next
              </Button>
            </div>
          </div>
        </section>
      </main>

      {rejectingUser ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.8rem] border border-white/70 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-neutral-950">Reject account request</h3>
            <p className="mt-2 text-sm leading-7 text-neutral-600">
              Add a clear reason so {rejectingUser.name} knows what to correct before asking for access again.
            </p>
            <div className="mt-4">
              <label htmlFor="rejectionReason" className="mb-2 block text-sm font-medium text-neutral-700">
                Rejection reason
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
                placeholder="Example: Please upload a clearer ID card image with your full name visible."
              />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  if (!isSubmitting) {
                    setRejectingUser(null);
                    setRejectionReason('');
                  }
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleReject()} isLoading={isSubmitting}>
                Reject account
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedUser ? (
        <div className="fixed inset-0 z-[78] flex justify-end bg-black/35 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-white/70 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-5 py-4 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">User detail</p>
                  <h3 className="mt-1 text-2xl font-semibold text-neutral-950">{selectedUser.name}</h3>
                  <p className="mt-1 text-sm text-neutral-500">{selectedUser.email}</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="rounded-2xl border border-neutral-200 bg-white p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6 p-5">
              {isDetailLoading ? (
                <PageLoader title="Loading user details" />
              ) : (
                <>
                  <section className="grid gap-4 sm:grid-cols-2">
                    <InfoCard icon={<Mail className="h-4 w-4" />} label="Email" value={selectedUser.email} />
                    <InfoCard icon={<Phone className="h-4 w-4" />} label="Phone" value={selectedUser.phone || 'Not provided'} />
                    <InfoCard icon={<UserCog className="h-4 w-4" />} label="Role" value={selectedUser.role} />
                    <InfoCard icon={<ShieldCheck className="h-4 w-4" />} label="Approval status" value={selectedUser.approvalStatus} />
                    <InfoCard icon={<CalendarDays className="h-4 w-4" />} label="Joined" value={selectedUser.createdAt ? formatDate(selectedUser.createdAt) : 'Unknown'} />
                    <InfoCard icon={<CalendarDays className="h-4 w-4" />} label="Department" value={selectedUser.department} />
                    {selectedUser.rollNumber ? (
                      <InfoCard icon={<UserCheck className="h-4 w-4" />} label="Roll number" value={selectedUser.rollNumber} />
                    ) : null}
                    <InfoCard icon={<UserX className="h-4 w-4" />} label="Account state" value={selectedUser.isActive ? 'Active' : 'Inactive'} />
                  </section>

                  <section className="rounded-[1.6rem] border border-neutral-200 bg-neutral-50 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-neutral-950">
                          {selectedUser.role === 'student' ? 'Uploaded ID card' : 'Verification document'}
                        </h4>
                        <p className="mt-1 text-sm text-neutral-500">
                          {selectedUser.role === 'student'
                            ? 'Students are reviewed against this document before access is unlocked.'
                            : 'Organizers currently do not upload a mandatory review document.'}
                        </p>
                      </div>
                      {selectedUser.hasIdCard ? (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => void openIdCard(selectedUser.id, selectedUser.name)}>
                            View full
                          </Button>
                          <Button variant="secondary" onClick={() => void openIdCard(selectedUser.id, selectedUser.name, true)}>
                            Download
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-4 overflow-hidden rounded-[1.3rem] border border-neutral-200 bg-white">
                      {selectedUser.hasIdCard && idCardPreviewUrl ? (
                        <img src={idCardPreviewUrl} alt={`${selectedUser.name} ID card`} className="max-h-[22rem] w-full object-contain bg-neutral-100" />
                      ) : (
                        <div className="flex min-h-48 items-center justify-center px-6 py-10 text-center text-sm text-neutral-500">
                          No ID card is available for this account.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-neutral-200 bg-neutral-50 p-5">
                    <h4 className="text-lg font-semibold text-neutral-950">Approval history</h4>
                    <div className="mt-4 space-y-4">
                      <HistoryRow
                        label="Approved"
                        timestamp={selectedUser.approvalMetadata?.approvedAt}
                        actor={selectedUser.approvalMetadata?.approvedBy?.name || selectedUser.approvalMetadata?.approvedBy?.email}
                      />
                      <HistoryRow
                        label="Rejected"
                        timestamp={selectedUser.approvalMetadata?.rejectedAt}
                        actor={selectedUser.approvalMetadata?.rejectedBy?.name || selectedUser.approvalMetadata?.rejectedBy?.email}
                        note={selectedUser.approvalMetadata?.rejectionReason}
                        tone="danger"
                      />
                    </div>
                  </section>

                  <section className="rounded-[1.6rem] border border-neutral-200 bg-neutral-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-neutral-950">Admin actions</h4>
                        <p className="mt-1 text-sm text-neutral-500">
                          {selectedUser.role === 'admin'
                            ? 'Admin accounts are view-only in this panel.'
                            : 'Available actions change with approval state so you only see the controls that make sense.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {selectedUser.hasIdCard ? (
                          <Button variant="secondary" onClick={() => void openIdCard(selectedUser.id, selectedUser.name)}>
                            Preview ID
                          </Button>
                        ) : null}
                        {canApproveUser(selectedUser) ? (
                          <Button onClick={() => void handleApprove(selectedUser.id)} isLoading={isSubmitting}>
                            Approve
                          </Button>
                        ) : null}
                        {canRejectUser(selectedUser) ? (
                          <Button
                            variant="danger"
                            onClick={() => {
                              setRejectingUser(selectedUser);
                              setRejectionReason(selectedUser.rejectionReason || '');
                            }}
                            disabled={isSubmitting}
                          >
                            Reject
                          </Button>
                        ) : null}
                        {canToggleActiveUser(selectedUser) ? (
                          <Button
                            variant="secondary"
                            onClick={() => void handleToggleActiveState(selectedUser)}
                            disabled={isSubmitting}
                          >
                            {selectedUser.isActive ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        ) : null}
                        {!canApproveUser(selectedUser) && !canRejectUser(selectedUser) && !canToggleActiveUser(selectedUser) ? (
                          <span className="rounded-2xl border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-500">
                            No direct actions available for this account state.
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
        <span className="text-neutral-400">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-neutral-950">{value}</p>
    </div>
  );
}

function HistoryRow({
  label,
  timestamp,
  actor,
  note,
  tone = 'default',
}: {
  label: string;
  timestamp?: string | null;
  actor?: string;
  note?: string | null;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className={cn(
      'rounded-[1.3rem] border p-4',
      tone === 'danger' ? 'border-rose-200 bg-rose-50' : 'border-neutral-200 bg-white'
    )}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500">{timestamp ? formatDate(timestamp) : 'No record yet'}</p>
      </div>
      <p className="mt-2 text-sm text-neutral-600">{actor ? `Handled by ${actor}` : 'No admin action recorded yet.'}</p>
      {note ? <p className="mt-2 text-sm leading-6 text-neutral-700">{note}</p> : null}
    </div>
  );
}
