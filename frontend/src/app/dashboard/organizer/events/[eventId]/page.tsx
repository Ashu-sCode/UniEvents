'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Filter, Search, Users, CheckCircle2, XCircle } from 'lucide-react';

import { useApi } from '@/hooks/useApi';
import { useToast } from '@/context/ToastContext';
import { attendanceAPI, eventsAPI, ticketsAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';

import type { Attendance, Event, Ticket } from '@/types';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

type TabKey = 'registrations' | 'attendance';

type AttendanceStats = {
  totalRegistered: number;
  totalAttended: number;
  attendanceRate: string;
  seatsAvailable: number;
};

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-5">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-neutral-200 rounded mb-6" />
          <div className="h-8 w-1/2 bg-neutral-200 rounded mb-3" />
          <div className="h-4 w-2/3 bg-neutral-100 rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white border border-neutral-100 rounded-2xl" />
            ))}
          </div>
          <div className="h-10 w-64 bg-white border border-neutral-100 rounded-2xl" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-white border border-neutral-100 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrganizerEventPage() {
  const router = useRouter();
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

  // Registrations filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'used' | 'cancelled'>('all');
  const [search, setSearch] = useState('');

  // Cancel modal state
  const [cancelCandidate, setCancelCandidate] = useState<Ticket | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadAll = async () => {
    setIsInitialLoading(true);

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

    setIsInitialLoading(false);
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const filteredRegistrations = useMemo(() => {
    const q = search.trim().toLowerCase();

    return registrations
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)
      .filter((t) => {
        if (!q) return true;

        const user = typeof t.userId === 'object' ? t.userId : null;
        const haystack = [
          t.ticketId,
          user?.name,
          user?.email,
          user?.rollNumber,
          user?.department,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(q);
      });
  }, [registrations, search, statusFilter]);

  const handleCancel = async () => {
    if (!cancelCandidate) return;

    const ticketId = cancelCandidate.ticketId;
    const prevRegs = registrations;
    const prevStats = stats;

    setIsCancelling(true);

    await api.run(() => ticketsAPI.cancel(ticketId), {
      optimisticUpdate: () => {
        setRegistrations((prev) =>
          prev.map((t) => (t.ticketId === ticketId ? { ...t, status: 'cancelled' } : t))
        );

        // keep stats in sync locally
        if (prevStats) {
          setStats({
            ...prevStats,
            totalRegistered: Math.max(0, prevStats.totalRegistered - 1),
            seatsAvailable: prevStats.seatsAvailable + 1,
          });
        }
      },
      rollback: () => {
        setRegistrations(prevRegs);
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

  if (isInitialLoading) return <PageSkeleton />;

  if (!event) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="mt-6 bg-white rounded-2xl border border-neutral-100 p-6">
            <p className="text-neutral-700">Event not found or you don’t have access.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard/organizer')}
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700"
                aria-label="Back"
                title="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm text-neutral-500">Event</p>
                <h1 className="text-lg font-semibold text-neutral-900 leading-tight">{event.title}</h1>
              </div>
            </div>

            <button
              onClick={() => {
                loadAll();
                toast.info('Refreshing…');
              }}
              className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-2xl border border-neutral-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-neutral-600 text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-neutral-400" />
                {formatDate(event.date)} • {event.time}
              </p>
              <p className="text-neutral-500 text-sm mt-1">{event.venue}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-sm font-medium">
                {event.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Registered" value={stats?.totalRegistered ?? event.registeredCount} />
          <StatCard label="Attended" value={stats?.totalAttended ?? attendance.length} />
          <StatCard label="Attendance rate" value={stats?.attendanceRate ?? '—'} />
          <StatCard label="Seats available" value={stats?.seatsAvailable ?? Math.max(0, event.seatLimit - event.registeredCount)} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('registrations')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'registrations'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            Registrations
          </button>
          <button
            onClick={() => setTab('attendance')}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              tab === 'attendance'
                ? 'bg-neutral-900 text-white border-neutral-900'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            Attendance
          </button>
        </div>

        {tab === 'registrations' ? (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, roll no, ticket id…"
                  className="w-full pl-10 pr-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="appearance-none w-full sm:w-auto pl-10 pr-10 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="all">All</option>
                  <option value="unused">Unused</option>
                  <option value="used">Used</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
                <p className="text-sm text-neutral-600">
                  <span className="font-medium text-neutral-900">{filteredRegistrations.length}</span> registrations
                </p>
              </div>

              <div className="divide-y divide-neutral-100">
                {filteredRegistrations.map((t) => {
                  const u = typeof t.userId === 'object' ? t.userId : null;

                  return (
                    <div key={t._id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-neutral-400" />
                          <p className="font-semibold text-neutral-900">{u?.name || 'Student'}</p>
                          <span className="text-xs font-mono bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-lg">
                            {t.ticketId}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 mt-1">
                          {u?.rollNumber ? `${u.rollNumber} • ` : ''}{u?.department || ''}{u?.email ? ` • ${u.email}` : ''}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">Status: {t.status}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {t.status === 'used' ? (
                          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-medium">
                            <CheckCircle2 className="h-4 w-4" /> Checked-in
                          </span>
                        ) : t.status === 'cancelled' ? (
                          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-medium">
                            <XCircle className="h-4 w-4" /> Cancelled
                          </span>
                        ) : (
                          <button
                            onClick={() => setCancelCandidate(t)}
                            className="px-4 py-2 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredRegistrations.length === 0 && (
                  <div className="p-10 text-center text-neutral-500 text-sm">No registrations found.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <p className="text-sm text-neutral-600">
                <span className="font-medium text-neutral-900">{attendance.length}</span> attendees checked-in
              </p>
            </div>

            <div className="divide-y divide-neutral-100">
              {attendance.map((a) => {
                const u = typeof a.userId === 'object' ? a.userId : null;
                const verified = typeof a.verifiedBy === 'object' ? a.verifiedBy : null;

                return (
                  <div key={a._id} className="p-5">
                    <p className="font-semibold text-neutral-900">{u?.name || 'Student'}</p>
                    <p className="text-sm text-neutral-600 mt-1">
                      {u?.rollNumber ? `${u.rollNumber} • ` : ''}{u?.department || ''}{u?.email ? ` • ${u.email}` : ''}
                    </p>
                    <p className="text-xs text-neutral-500 mt-2">
                      Entry time: {new Date(a.entryTime).toLocaleString()} {verified?.name ? `• Verified by ${verified.name}` : ''}
                    </p>
                  </div>
                );
              })}

              {attendance.length === 0 && (
                <div className="p-10 text-center text-neutral-500 text-sm">No check-ins yet.</div>
              )}
            </div>
          </div>
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
