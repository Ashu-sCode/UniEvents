'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  Ticket as TicketIcon,
  Users,
  XCircle,
} from 'lucide-react';

import { DashboardNavbar } from '@/components/DashboardNavbar';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { attendanceAPI, eventsAPI, ticketsAPI } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { LoadingGrid, PageLoader, SectionLoader } from '@/components/ui';

import type { Attendance, AttendanceStats, Event, Ticket } from '@/types';

type TabKey = 'registrations' | 'attendance';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function HeroHighlight({
  value,
  label,
  helper,
}: {
  value: string | number;
  label: string;
  helper: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{label}</p>
      <p className="mt-2 text-xs leading-5 text-slate-300">{helper}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Event['status'] }) {
  const tones: Record<Event['status'], string> = {
    draft: 'bg-white/12 text-white ring-1 ring-white/15',
    published: 'bg-emerald-400/15 text-emerald-50 ring-1 ring-emerald-200/20',
    ongoing: 'bg-amber-400/15 text-amber-50 ring-1 ring-amber-200/20',
    completed: 'bg-sky-400/15 text-sky-50 ring-1 ring-sky-200/20',
    cancelled: 'bg-rose-400/15 text-rose-50 ring-1 ring-rose-200/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
        tones[status]
      )}
    >
      {status}
    </span>
  );
}

function SurfaceCard({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/90 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 border-b border-neutral-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-base font-semibold text-neutral-900">{title}</p>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function OrganizerEventPage() {
  const params = useParams();
  const eventId = String(params.eventId);

  const api = useApi();
  const toast = useToast();

  const [tab, setTab] = useState<TabKey>('registrations');

  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Ticket[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'used' | 'cancelled' | 'waitlisted'>('all');
  const [search, setSearch] = useState('');

  const [cancelCandidate, setCancelCandidate] = useState<Ticket | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadAll = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }

    await api.run(
      async () => {
        const [eventRes, regRes, attRes, statsRes] = await Promise.all([
          eventsAPI.getById(eventId),
          eventsAPI.getRegistrations(eventId),
          attendanceAPI.getEventAttendance(eventId),
          attendanceAPI.getEventStats(eventId),
        ]);

        setEvent(eventRes.data.data.event);
        setRegistrations(regRes.data.data.registrations || []);
        setAttendance(attRes.data.data.attendance || []);
        setStats(statsRes.data.data.stats);

        return true;
      },
      {
        errorMessage: (err) => err?.response?.data?.message || 'Failed to load event details',
      }
    );

    if (mode === 'initial') {
      setIsInitialLoading(false);
    } else {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAll('initial');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const filteredRegistrations = useMemo(() => {
    const q = search.trim().toLowerCase();

    return registrations
      .filter((ticket) => statusFilter === 'all' || ticket.status === statusFilter)
      .filter((ticket) => {
        if (!q) return true;

        const user = typeof ticket.userId === 'object' ? ticket.userId : null;
        const haystack = [ticket.ticketId, user?.name, user?.email, user?.rollNumber, user?.department]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(q);
      });
  }, [registrations, search, statusFilter]);

  const handleCancel = async () => {
    if (!cancelCandidate) return;

    const ticketId = cancelCandidate.ticketId;
    const prevRegistrations = registrations;
    const prevStats = stats;

    setIsCancelling(true);

    await api.run(() => ticketsAPI.cancel(ticketId), {
      optimisticUpdate: () => {
        setRegistrations((prev) =>
          prev.map((ticket) => (ticket.ticketId === ticketId ? { ...ticket, status: 'cancelled' } : ticket))
        );

        if (prevStats) {
          setStats({
            ...prevStats,
            totalRegistered: Math.max(0, prevStats.totalRegistered - 1),
            seatsAvailable: prevStats.seatsAvailable + 1,
          });
        }
      },
      rollback: () => {
        setRegistrations(prevRegistrations);
        setStats(prevStats);
      },
      successMessage: 'Ticket cancelled',
      errorMessage: (err) => err?.response?.data?.message || 'Failed to cancel ticket',
      onSuccess: () => {
        setCancelCandidate(null);
      },
    });

    setIsCancelling(false);
  };

  if (isInitialLoading) {
    return (
      <PageLoader
        title="Loading event workspace"
        message="Preparing registrations, attendance, and performance data."
      />
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0%,transparent_24%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_45%,#f8fafc_100%)]">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
          >
            Back
          </button>

          <div className="mt-6 rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-sm">
            <p className="text-neutral-700">Event not found or you do not have access.</p>
          </div>
        </div>
      </div>
    );
  }

  const registrationsCount = stats?.totalRegistered ?? event.registeredCount;
  const attendanceCount = stats?.totalAttended ?? attendance.length;
  const attendanceRate = stats?.attendanceRate ?? 'N/A';
  const seatsAvailable = stats?.seatsAvailable ?? Math.max(0, event.seatLimit - event.registeredCount);
  const waitlistCount = event.waitlistCount ?? 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0%,transparent_24%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_45%,#f8fafc_100%)]">
      <DashboardNavbar
        role="organizer"
        title={event.title}
        subtitle="Event workspace"
        backHref="/dashboard/organizer"
        trailingActions={
          <button
            onClick={() => {
              loadAll('refresh');
              toast.info('Refreshing...');
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-60"
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isRefreshing && (
          <div className="mb-6">
            <SectionLoader
              title="Refreshing event details"
              message="Updating registrations, attendance, and summary stats."
            />
          </div>
        )}

        <section className="relative mb-8 overflow-hidden rounded-[2rem] bg-neutral-950 px-6 py-7 text-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.75)] sm:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(74,222,128,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.2),transparent_32%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.95fr)]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={event.status} />
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-100 ring-1 ring-white/10">
                  <TicketIcon className="h-3.5 w-3.5" />
                  {registrationsCount} registrations
                </span>
              </div>

              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-[2.4rem]">
                {event.title}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                Monitor registrations, attendance, seat capacity, waitlist movement, and certificate progress from one event workspace.
              </p>

              <div className="mt-6 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                  <p className="flex items-center gap-2 font-medium text-white">
                    <Calendar className="h-4 w-4 text-emerald-200" />
                    {formatDate(event.date)}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-slate-300">
                    <Clock className="h-4 w-4 text-slate-400" />
                    {event.time}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                  <p className="flex items-center gap-2 font-medium text-white">
                    <MapPin className="h-4 w-4 text-sky-200" />
                    Venue
                  </p>
                  <p className="mt-1 text-slate-300">{event.venue}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/8 px-4 py-3 backdrop-blur-sm">
                  <p className="font-medium text-white">Capacity</p>
                  <p className="mt-1 text-slate-300">
                    {event.registeredCount}/{event.seatLimit} seats used
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <HeroHighlight
                value={attendanceRate}
                label="Attendance rate"
                helper="Use this to spot events that need better reminder or check-in follow-up."
              />
              <HeroHighlight
                value={waitlistCount}
                label="Waitlist size"
                helper="Waitlisted students are promoted automatically when confirmed seats open up."
              />
              <HeroHighlight
                value={stats?.certificateIssuedCount ?? 0}
                label="Certificates issued"
                helper="Generated certificates that are already ready for attendees."
              />
              <HeroHighlight
                value={seatsAvailable}
                label="Open seats"
                helper="Live capacity remaining after confirmed registrations and cancellations."
              />
            </div>
          </div>
        </section>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Registered" value={registrationsCount} />
          <StatCard label="Attended" value={attendanceCount} />
          <StatCard label="Attendance rate" value={attendanceRate} />
          <StatCard label="Seats available" value={seatsAvailable} />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="No-shows" value={stats?.noShowCount ?? Math.max(0, event.registeredCount - attendance.length)} />
          <StatCard label="Certificates issued" value={stats?.certificateIssuedCount ?? 0} />
          <StatCard label="Certificates pending" value={stats?.certificatePendingCount ?? 0} />
          <StatCard label="Waitlist" value={waitlistCount} />
        </div>

        <section className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <SurfaceCard
            title="Performance summary"
            subtitle="A quick operational read on event health, attendance quality, and certificate progress."
          >
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <p className="text-lg font-semibold leading-8 text-neutral-900">
                {stats?.performanceSummary ?? 'Performance summary unavailable'}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Attendance</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-950">{attendanceRate}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">No-shows</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-950">{stats?.noShowCount ?? 'N/A'}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Certificates</p>
                  <p className="mt-2 text-2xl font-semibold text-sky-950">{stats?.certificateIssuedCount ?? 'N/A'}</p>
                </div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard
            title="Event pulse"
            subtitle="Live operational signals to help you act quickly during and after the event."
          >
            <div className="grid gap-3 px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <p className="text-sm font-medium text-neutral-600">Registration coverage</p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-neutral-900"
                    style={{ width: `${Math.min(100, Math.round((event.registeredCount / Math.max(event.seatLimit, 1)) * 100))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  {event.registeredCount} confirmed out of {event.seatLimit} seats
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                <p className="text-sm font-medium text-neutral-600">Check-in progress</p>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, Math.round((attendanceCount / Math.max(registrationsCount, 1)) * 100))}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-neutral-500">{attendanceCount} students checked in so far</p>
              </div>
            </div>
          </SurfaceCard>
        </section>

        <div className="mb-6 flex flex-wrap gap-3 rounded-[1.5rem] border border-white/70 bg-white/80 p-2 shadow-sm backdrop-blur">
          {(['registrations', 'attendance'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'rounded-[1rem] px-4 py-2.5 text-sm font-medium transition-colors',
                tab === key ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-700 hover:bg-neutral-100'
              )}
            >
              {key === 'registrations' ? 'Registrations' : 'Attendance'}
            </button>
          ))}
        </div>

        {tab === 'registrations' ? (
          <SurfaceCard
            title="Registration roster"
            subtitle="Search the roster, review waitlist activity, and cancel tickets when needed."
            actions={
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                {filteredRegistrations.length} records
              </span>
            }
          >
            <div className="border-b border-neutral-100 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, roll number, or ticket id..."
                    className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="w-full appearance-none rounded-xl border border-neutral-200 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 sm:w-auto"
                  >
                    <option value="all">All</option>
                    <option value="unused">Unused</option>
                    <option value="waitlisted">Waitlisted</option>
                    <option value="used">Used</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {isRefreshing ? (
              <div className="p-5 sm:p-6">
                <LoadingGrid variant="cards" count={4} />
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {filteredRegistrations.map((ticket) => {
                  const user = typeof ticket.userId === 'object' ? ticket.userId : null;
                  const details = [user?.rollNumber, user?.department, user?.email].filter(Boolean).join(' · ');

                  return (
                    <div key={ticket._id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Users className="h-4 w-4 text-neutral-400" />
                          <p className="text-base font-semibold text-neutral-900">{user?.name || 'Student'}</p>
                          <span className="rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700">
                            {ticket.ticketId}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-neutral-600">{details || 'Profile details unavailable'}</p>
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">
                          Status: {ticket.status}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {ticket.status === 'used' ? (
                          <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                            <CheckCircle2 className="h-4 w-4" /> Checked-in
                          </span>
                        ) : ticket.status === 'cancelled' ? (
                          <span className="inline-flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700">
                            <XCircle className="h-4 w-4" /> Cancelled
                          </span>
                        ) : ticket.status === 'waitlisted' ? (
                          <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                            <Clock className="h-4 w-4" /> Waitlisted
                          </span>
                        ) : (
                          <button
                            onClick={() => setCancelCandidate(ticket)}
                            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredRegistrations.length === 0 && (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-neutral-700">No registrations matched the current filters.</p>
                    <p className="mt-2 text-sm text-neutral-500">
                      Try a broader search or switch back to all statuses to review the full roster.
                    </p>
                  </div>
                )}
              </div>
            )}
          </SurfaceCard>
        ) : (
          <SurfaceCard
            title="Attendance log"
            subtitle="Track the students who have checked in and confirm who validated each entry."
            actions={
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                {attendance.length} checked-in
              </span>
            }
          >
            {isRefreshing ? (
              <div className="p-5 sm:p-6">
                <LoadingGrid variant="cards" count={4} />
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {attendance.map((entry) => {
                  const user = typeof entry.userId === 'object' ? entry.userId : null;
                  const verified = typeof entry.verifiedBy === 'object' ? entry.verifiedBy : null;
                  const details = [user?.rollNumber, user?.department, user?.email].filter(Boolean).join(' · ');

                  return (
                    <div key={entry._id} className="px-5 py-5 sm:px-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-neutral-900">{user?.name || 'Student'}</p>
                          <p className="mt-1 text-sm text-neutral-600">{details || 'Profile details unavailable'}</p>
                        </div>
                        <span className="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                          <CheckCircle2 className="h-4 w-4" />
                          Checked-in
                        </span>
                      </div>
                      <p className="mt-3 text-xs text-neutral-500">
                        Entry time: {new Date(entry.entryTime).toLocaleString()}
                        {verified?.name ? ` · Verified by ${verified.name}` : ''}
                      </p>
                    </div>
                  );
                })}

                {attendance.length === 0 && (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-neutral-700">No check-ins yet.</p>
                    <p className="mt-2 text-sm text-neutral-500">
                      Once students are scanned at the venue, their attendance will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </SurfaceCard>
        )}
      </main>

      <ConfirmModal
        isOpen={!!cancelCandidate}
        onClose={() => {
          if (isCancelling) return;
          setCancelCandidate(null);
        }}
        onConfirm={handleCancel}
        title="Cancel ticket"
        message="Are you sure you want to cancel this ticket? The student will not be able to enter using this ticket."
        confirmText="Cancel ticket"
        cancelText="Back"
        variant="warning"
        isLoading={isCancelling}
      />
    </div>
  );
}
