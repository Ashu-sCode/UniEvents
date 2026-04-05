'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock3, FileBadge2, LogOut, ShieldCheck, XCircle } from 'lucide-react';

import { PageLoader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getApprovalLabel, getDashboardRoute, isApprovedUser } from '@/lib/authState';

export default function AccountStatusPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (user && isApprovedUser(user)) {
      router.replace(getDashboardRoute(user.role));
    }
  }, [router, user]);

  if (isLoading) {
    return <PageLoader title="Checking account status" />;
  }

  if (!user) {
    return null;
  }

  if (isApprovedUser(user)) {
    return null;
  }

  const isStudent = user.role === 'student';
  const isRejected = user.approvalStatus === 'rejected';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0%,transparent_22%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_22%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_45%,#f8fafc_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.1)] backdrop-blur-xl sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-600">
              {isRejected ? <XCircle className="h-4 w-4 text-rose-500" /> : <Clock3 className="h-4 w-4 text-amber-500" />}
              {getApprovalLabel(user.approvalStatus)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              {user.role}
            </span>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
            <section>
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
                {isRejected ? 'Your account needs another review step.' : 'Your account is waiting for admin approval.'}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-neutral-600">
                {isRejected
                  ? 'Access to the dashboard is still paused. Review the reason below, update your details if needed, and contact the admin team before trying again.'
                  : isStudent
                    ? 'Your student account has been created and your ID card is on file. An admin will review it before event registration and ticket access are enabled.'
                    : 'Your organizer account has been created. An admin will review your request before event creation, scanning, and analytics tools are unlocked.'}
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-5">
                  <p className="text-sm font-medium text-neutral-500">Account email</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">{user.email}</p>
                </div>
                <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-5">
                  <p className="text-sm font-medium text-neutral-500">Submitted role</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">{user.role}</p>
                </div>
                <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-5">
                  <p className="text-sm font-medium text-neutral-500">Stream</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">{user.department}</p>
                </div>
                <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-5">
                  <p className="text-sm font-medium text-neutral-500">Student ID card</p>
                  <p className="mt-2 text-lg font-semibold text-neutral-900">
                    {isStudent ? (user.idCardUrl ? 'Received' : 'Missing') : 'Not required'}
                  </p>
                </div>
              </div>

              {isRejected && user.rejectionReason ? (
                <div className="mt-6 rounded-[1.5rem] border border-rose-200 bg-rose-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Review note</p>
                  <p className="mt-3 text-sm leading-7 text-rose-900">{user.rejectionReason}</p>
                </div>
              ) : null}
            </section>

            <aside className="rounded-[1.8rem] bg-[linear-gradient(160deg,#0f172a_0%,#111827_48%,#16352b_100%)] p-6 text-white shadow-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
                <FileBadge2 className="h-4 w-4" />
                Next steps
              </div>
              <ul className="mt-6 space-y-4 text-sm leading-7 text-slate-200">
                <li>Keep this account signed in to check approval updates.</li>
                <li>Approval unlocks the full dashboard automatically.</li>
                <li>Use the same email address for all future campus event activity.</li>
              </ul>

              <div className="mt-8 flex flex-col gap-3">
                <Link href="/login" className="btn-primary inline-flex w-full items-center justify-center">
                  Back to sign in
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
