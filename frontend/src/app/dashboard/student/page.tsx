'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { eventsAPI, ticketsAPI, certificatesAPI } from '@/lib/api';
import { formatDate, getStatusColor, downloadBlob, getImageUrl } from '@/lib/utils';
import {
  Calendar, Ticket, Award,
  MapPin, Clock, Users, Download, FileText, Eye,
  ChevronDown, ChevronRight, Search, Filter
} from 'lucide-react';
import type { Event, Ticket as TicketType, Certificate } from '@/types';
import CertificatePreviewModal from '@/components/CertificatePreviewModal';
import { DashboardNavbar } from '@/components/DashboardNavbar';
import TicketPreviewModal from '@/components/TicketPreviewModal';
import { AsyncImage, LoadingGrid, SectionLoader } from '@/components/ui';
import { STREAM_OPTIONS } from '@/constants/streams';
import { useRequireAuthRole } from '@/hooks/useRequireAuthRole';
import { PageLoader } from '@/components/ui';

const STUDENT_FILTERS_STORAGE_KEY = 'unievent.student.filters';
const SEEN_PROMOTION_STORAGE_KEY = 'unievent.student.seenPromotions';

export default function StudentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { isReady } = useRequireAuthRole('student');
  const toast = useToast();
  const api = useApi();
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketsAll, setTicketsAll] = useState<TicketType[]>([]);
  const [ticketsPageItems, setTicketsPageItems] = useState<TicketType[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEventsLoading, setIsEventsLoading] = useState(true);
  const [isTicketsLoading, setIsTicketsLoading] = useState(true);
  const [isCertificatesLoading, setIsCertificatesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'tickets' | 'certificates'>('events');

  // Pagination
  const EVENTS_LIMIT = 6;
  const TICKETS_LIMIT = 6;

  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotalPages, setEventsTotalPages] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);

  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsTotalPages, setTicketsTotalPages] = useState(1);
  const [ticketsTotal, setTicketsTotal] = useState(0);

  // Event search/filter
  const [eventSearchInput, setEventSearchInput] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [eventDepartment, setEventDepartment] = useState('');
  const [eventType, setEventType] = useState<'all' | 'public' | 'departmental'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'unused' | 'used' | 'cancelled' | 'waitlisted'>('all');
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null);
  const [previewTicket, setPreviewTicket] = useState<TicketType | null>(null);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);
  const [recentPromotion, setRecentPromotion] = useState<TicketType | null>(null);
  const skipNextEventsEffect = useRef(true);
  const skipNextTicketsEffect = useRef(true);
  const knownTicketStatusesRef = useRef<Record<string, TicketType['status']>>({});

  const markPromotionSeen = (ticketId: string) => {
    if (typeof window === 'undefined') return;
    try {
      const current = JSON.parse(window.localStorage.getItem(SEEN_PROMOTION_STORAGE_KEY) || '[]') as string[];
      if (!current.includes(ticketId)) {
        window.localStorage.setItem(
          SEEN_PROMOTION_STORAGE_KEY,
          JSON.stringify([...current, ticketId])
        );
      }
    } catch {
      // Ignore local storage issues for non-critical demo polish.
    }
  };

  const hasSeenPromotion = (ticketId: string) => {
    if (typeof window === 'undefined') return false;
    try {
      const current = JSON.parse(window.localStorage.getItem(SEEN_PROMOTION_STORAGE_KEY) || '[]') as string[];
      return current.includes(ticketId);
    } catch {
      return false;
    }
  };

  const detectPromotions = (incomingTickets: TicketType[]) => {
    const previousStatuses = knownTicketStatusesRef.current;
    const nextStatuses: Record<string, TicketType['status']> = {};

    incomingTickets.forEach((ticket) => {
      nextStatuses[ticket.ticketId] = ticket.status;

      const previousStatus = previousStatuses[ticket.ticketId];
      const wasPromoted =
        ticket.status === 'unused' &&
        Boolean(ticket.promotedAt) &&
        (previousStatus === 'waitlisted' || !hasSeenPromotion(ticket.ticketId));

      if (wasPromoted) {
        setRecentPromotion(ticket);
        toast.success('A waitlisted ticket has been promoted to a confirmed seat.');
        markPromotionSeen(ticket.ticketId);
      }
    });

    knownTicketStatusesRef.current = nextStatuses;
  };

  // Read initial page state from query string (client-side) to avoid Next.js useSearchParams SSR issues
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ep = parseInt(params.get('eventsPage') || '1', 10);
    const tp = parseInt(params.get('ticketsPage') || '1', 10);
    const tab = params.get('tab');
    if (!isNaN(ep) && ep > 0) setEventsPage(ep);
    if (!isNaN(tp) && tp > 0) setTicketsPage(tp);
    if (tab === 'events' || tab === 'tickets' || tab === 'certificates') {
      setActiveTab(tab);
    }

    try {
      const storedFilters = window.localStorage.getItem(STUDENT_FILTERS_STORAGE_KEY);
      if (storedFilters) {
        const parsed = JSON.parse(storedFilters) as {
          eventSearchInput?: string;
          eventDepartment?: string;
          eventType?: 'all' | 'public' | 'departmental';
          dateFrom?: string;
          dateTo?: string;
          ticketFilter?: 'all' | 'unused' | 'used' | 'cancelled' | 'waitlisted';
        };

        setEventSearchInput(parsed.eventSearchInput || '');
        setEventDepartment(parsed.eventDepartment || '');
        setEventType(parsed.eventType || 'all');
        setDateFrom(parsed.dateFrom || '');
        setDateTo(parsed.dateTo || '');
        setTicketFilter(parsed.ticketFilter || 'all');
      }
    } catch {
      // Ignore corrupted local state and fall back to defaults.
    }
  }, []);

  // Debounce event search input
  useEffect(() => {
    const t = setTimeout(() => setEventSearch(eventSearchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [eventSearchInput]);

  // Keep pages in query string
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('eventsPage', String(eventsPage));
    url.searchParams.set('ticketsPage', String(ticketsPage));
    url.searchParams.set('tab', activeTab);
    window.history.replaceState(null, '', url.toString());
  }, [activeTab, eventsPage, ticketsPage]);

  useEffect(() => {
    window.localStorage.setItem(
      STUDENT_FILTERS_STORAGE_KEY,
      JSON.stringify({
        eventSearchInput,
        eventDepartment,
        eventType,
        dateFrom,
        dateTo,
        ticketFilter,
      })
    );
  }, [dateFrom, dateTo, eventDepartment, eventSearchInput, eventType, ticketFilter]);

  const fetchEvents = async () => {
    const params: any = {
      upcoming: 'true',
      page: eventsPage,
      limit: EVENTS_LIMIT,
    };

    if (eventSearch) params.search = eventSearch;
    if (eventDepartment) params.department = eventDepartment;
    if (eventType !== 'all') params.type = eventType;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    try {
      setIsEventsLoading(true);
      const eventsRes = await eventsAPI.getAll(params);
      setEvents(eventsRes.data.data.events);
      setEventsTotal(eventsRes.data.total || 0);
      setEventsTotalPages(eventsRes.data.totalPages || 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load events');
    } finally {
      setIsEventsLoading(false);
    }
  };

  const fetchTicketsAll = async () => {
    try {
      const ticketsRes = await ticketsAPI.getMyTickets();
      const nextTickets = ticketsRes.data.data.tickets;
      setTicketsAll(nextTickets);
      detectPromotions(nextTickets);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load tickets');
    }
  };

  const fetchTicketsPage = async () => {
    try {
      setIsTicketsLoading(true);
      const params: Record<string, string | number> = { page: ticketsPage, limit: TICKETS_LIMIT };
      if (ticketFilter !== 'all') {
        params.status = ticketFilter;
      }
      const ticketsRes = await ticketsAPI.getAll(params);
      setTicketsPageItems(ticketsRes.data.data.tickets);
      setTicketsTotal(ticketsRes.data.total || 0);
      setTicketsTotalPages(ticketsRes.data.totalPages || 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load tickets');
    } finally {
      setIsTicketsLoading(false);
    }
  };

  const fetchCertificates = async () => {
    try {
      setIsCertificatesLoading(true);
      const certificatesRes = await certificatesAPI.getMyCertificates();
      setCertificates(certificatesRes.data.data.certificates || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load certificates');
    } finally {
      setIsCertificatesLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    (async () => {
      setIsLoading(true);
      await Promise.all([fetchEvents(), fetchTicketsAll(), fetchTicketsPage(), fetchCertificates()]);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (skipNextEventsEffect.current) {
      skipNextEventsEffect.current = false;
      return;
    }
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsPage, eventSearch, eventDepartment, eventType, dateFrom, dateTo]);

  useEffect(() => {
    if (skipNextTicketsEffect.current) {
      skipNextTicketsEffect.current = false;
      return;
    }
    fetchTicketsPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketFilter, ticketsPage]);

  useEffect(() => {
    if (activeTab !== 'tickets') {
      return;
    }

    fetchTicketsAll();
    fetchTicketsPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    const refreshTicketsIfNeeded = () => {
      if (document.visibilityState === 'visible' && activeTab === 'tickets') {
        fetchTicketsAll();
        fetchTicketsPage();
      }
    };

    window.addEventListener('focus', refreshTicketsIfNeeded);
    document.addEventListener('visibilitychange', refreshTicketsIfNeeded);

    return () => {
      window.removeEventListener('focus', refreshTicketsIfNeeded);
      document.removeEventListener('visibilitychange', refreshTicketsIfNeeded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, ticketFilter, ticketsPage]);

  const handleRegister = async (eventId: string) => {
    setRegisteringEventId(eventId);

    await api.run(() => ticketsAPI.register(eventId), {
      successMessage: (response) =>
        response.data.data.registrationType === 'waitlist'
          ? 'Added to the waitlist'
          : 'Successfully registered for the event',
      errorMessage: (err) => err?.response?.data?.message || 'Registration failed',
      onSuccess: (response) => {
        const { ticket: newTicket, registrationType, waitlistPosition } = response.data.data;
        const shouldCountConfirmed = registrationType === 'confirmed';
        const nextTotal = ticketsTotal + 1;

        setTicketsAll((prev) => [newTicket, ...prev]);
        setTicketsTotal(nextTotal);
        setTicketsTotalPages(Math.max(1, Math.ceil(nextTotal / TICKETS_LIMIT)));

        if (ticketsPage === 1 && (ticketFilter === 'all' || ticketFilter === newTicket.status)) {
          setTicketsPageItems((prev) => [newTicket, ...prev].slice(0, TICKETS_LIMIT));
        }

        setEvents((prev) =>
          prev.map((event) =>
            event._id === eventId
              ? {
                  ...event,
                  registeredCount: shouldCountConfirmed ? event.registeredCount + 1 : event.registeredCount,
                  waitlistCount: shouldCountConfirmed ? event.waitlistCount ?? 0 : (event.waitlistCount ?? 0) + 1,
                  seatsAvailable: shouldCountConfirmed ? Math.max(0, event.seatsAvailable - 1) : event.seatsAvailable,
                }
              : event
          )
        );

        if (registrationType === 'waitlist') {
          toast.info(`Added to waitlist${waitlistPosition ? ` at position #${waitlistPosition}` : ''}.`);
        }
      },
    });

    setRegisteringEventId(null);
  };

  const handleDownloadTicket = async (ticketId: string) => {
    try {
      const response = await ticketsAPI.download(ticketId);
      downloadBlob(response.data, `ticket-${ticketId}.pdf`);
      toast.success('Ticket downloaded');
    } catch (error) {
      toast.error('Failed to download ticket');
    }
  };

  const handleDownloadCertificate = async (certificateId: string) => {
    try {
      const response = await certificatesAPI.download(certificateId);
      downloadBlob(response.data, `certificate-${certificateId}.pdf`);
      toast.success('Certificate downloaded');
    } catch (error) {
      toast.error('Failed to download certificate');
    }
  };

  const isRegistered = (eventId: string) => {
    return ticketsAll.some(t => {
      // `t.eventId` can be a string, a populated event object, or null (e.g. if the event was deleted).
      const eId =
        typeof t.eventId === 'string'
          ? t.eventId
          : t.eventId?._id;
      return !!eId && eId === eventId && t.status !== 'cancelled';
    });
  };

  const sortedAndFilteredTickets = useMemo(() => {
    // Stable sort: keep original index as final tie-breaker
    const withIndex = ticketsPageItems.map((t, idx) => ({ t, idx }));

    const getEventDateMs = (ticket: TicketType): number => {
      const event = typeof ticket.eventId === 'object' ? ticket.eventId : null;
      const date = event?.date;
      const ms = date ? new Date(date).getTime() : Number.POSITIVE_INFINITY;
      return Number.isFinite(ms) ? ms : Number.POSITIVE_INFINITY;
    };

    withIndex.sort((a, b) => {
      const aMs = getEventDateMs(a.t);
      const bMs = getEventDateMs(b.t);
      if (aMs !== bMs) return aMs - bMs;
      return a.idx - b.idx;
    });

    return withIndex.map(x => x.t);
  }, [ticketsPageItems]);

  const hasActiveEventFilters = Boolean(eventSearch || eventDepartment || eventType !== 'all' || dateFrom || dateTo);

  const clearEventFilters = () => {
    setEventsPage(1);
    setEventSearchInput('');
    setEventSearch('');
    setEventDepartment('');
    setEventType('all');
    setDateFrom('');
    setDateTo('');
  };

  const activeStudentTickets = ticketsAll.filter((ticket) => ticket.status === 'unused' || ticket.status === 'waitlisted').length;
  const attendedEventsCount = ticketsAll.filter((ticket) => ticket.status === 'used').length;
  const waitlistedTicketsCount = ticketsAll.filter((ticket) => ticket.status === 'waitlisted').length;

  if (!isReady) {
    return <PageLoader title="Preparing student dashboard" />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,transparent_28%),radial-gradient(circle_at_top_right,#e0f2fe_0%,transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_45%,#f8fafc_100%)]">
      <DashboardNavbar role="student" title="Student Dashboard" subtitle="Browse events, tickets, waitlists, and certificates" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_55%,#334155_100%)] px-6 py-8 text-white shadow-[0_20px_70px_rgba(15,23,42,0.14)] sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr] lg:items-end">
            <div>
              <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm font-medium text-sky-100">
                Student activity at a glance
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Welcome back, {user?.name?.split(' ')[0] || 'Student'}.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                Browse upcoming events, monitor ticket status, follow waitlist movement, and keep certificates ready from one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{user?.department || 'Your stream'}</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{activeStudentTickets} active entries</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">{attendedEventsCount} attended events</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <QuickHighlight value={activeStudentTickets} label="Active Tickets" helper="Confirmed or waiting for promotion" />
              <QuickHighlight value={waitlistedTicketsCount} label="Waitlisted" helper="Seats pending availability" />
              <QuickHighlight value={certificates.length} label="Certificates" helper="Issued and ready to download" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            icon={<Calendar className="h-6 w-6" />}
            label="Upcoming Events"
            value={eventsTotal || events.length}
            onClick={() => setActiveTab('events')}
            isActive={activeTab === 'events'}
          />
          <StatCard
            icon={<Ticket className="h-6 w-6" />}
            label="My Tickets"
            value={ticketsTotal || ticketsAll.length}
            onClick={() => setActiveTab('tickets')}
            isActive={activeTab === 'tickets'}
          />
          <StatCard
            icon={<Award className="h-6 w-6" />}
            label="Certificates"
            value={certificates.length}
            onClick={() => setActiveTab('certificates')}
            isActive={activeTab === 'certificates'}
          />
        </div>

        <div className="mb-8 rounded-[1.75rem] border border-neutral-200 bg-white/90 p-3 shadow-sm backdrop-blur">
          <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-5 py-2.5 rounded-2xl font-medium transition-all ${
              activeTab === 'events'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-transparent text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Browse Events
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-5 py-2.5 rounded-2xl font-medium transition-all ${
              activeTab === 'tickets'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-transparent text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            My Tickets
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-5 py-2.5 rounded-2xl font-medium transition-all ${
              activeTab === 'certificates'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-transparent text-neutral-600 hover:bg-neutral-100'
            }`}
          >
            Certificates
          </button>
        </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingGrid variant="events" count={6} />
        ) : activeTab === 'events' ? (
          isEventsLoading ? (
            <div className="space-y-5">
              <SectionLoader
                title="Refreshing events"
                message="Updating the latest event list and filters."
              />
              <LoadingGrid variant="events" count={6} />
            </div>
          ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Search & filters */}
            <div className="md:col-span-2 lg:col-span-3 mb-2">
              <div className="flex flex-col gap-3 rounded-[1.6rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5">
                <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    value={eventSearchInput}
                    onChange={(e) => {
                      setEventsPage(1);
                      setEventSearchInput(e.target.value);
                    }}
                    placeholder="Search events…"
                    className="w-full rounded-2xl border border-neutral-200/80 bg-white px-10 py-3 text-sm text-neutral-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-neutral-900/70"
                  />
                </div>

                <div className="relative sm:min-w-[11rem]">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <select
                    value={eventType}
                    onChange={(e) => {
                      setEventsPage(1);
                      setEventType(e.target.value as any);
                    }}
                    className="w-full appearance-none rounded-2xl border border-neutral-200/80 bg-white px-10 py-3 text-sm font-medium text-neutral-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-neutral-900/70"
                  >
                    <option value="all">All Types</option>
                    <option value="public">Public</option>
                    <option value="departmental">Departmental</option>
                  </select>
                </div>

                <div className="relative w-full sm:w-64">
                  <Users className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <select
                    value={eventDepartment}
                    onChange={(e) => {
                      setEventsPage(1);
                      setEventDepartment(e.target.value);
                    }}
                    className="w-full appearance-none rounded-2xl border border-neutral-200/80 bg-white px-10 py-3 text-sm font-medium text-neutral-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-neutral-900/70"
                  >
                    <option value="">All Departments</option>
                    {STREAM_OPTIONS.map((stream) => (
                      <option key={stream.value} value={stream.value}>
                        {stream.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full sm:w-52">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setEventsPage(1);
                      setDateFrom(e.target.value);
                    }}
                    className="w-full rounded-2xl border border-neutral-200/80 bg-white px-10 py-3 text-sm font-medium text-neutral-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-neutral-900/70"
                    title="From date"
                    aria-label="From date"
                  />
                </div>

                <div className="relative w-full sm:w-52">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setEventsPage(1);
                      setDateTo(e.target.value);
                    }}
                    className="w-full rounded-2xl border border-neutral-200/80 bg-white px-10 py-3 text-sm font-medium text-neutral-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-neutral-900/70"
                    title="To date"
                    aria-label="To date"
                  />
                </div>
              </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-500">
                  <span>Filters are saved on this device.</span>
                  {hasActiveEventFilters && (
                    <button
                      onClick={clearEventFilters}
                      className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-100"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            </div>

            {events.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                isRegistered={isRegistered(event._id)}
                isRegistering={registeringEventId === event._id}
                onRegister={() => handleRegister(event._id)}
              />
            ))}
            {events.length === 0 && (
              <div className="col-span-3 rounded-2xl border border-neutral-100 bg-white p-12 text-center">
                <p className="text-neutral-700 font-medium">
                  {hasActiveEventFilters ? 'No events match your saved filters.' : 'No events found right now.'}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  {hasActiveEventFilters
                    ? 'Try clearing a filter or widening your date range.'
                    : 'Check back soon for newly published events.'}
                </p>
                {hasActiveEventFilters && (
                  <button
                    onClick={clearEventFilters}
                    className="mt-4 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {eventsTotalPages > 1 && (
              <div className="col-span-full flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                  disabled={eventsPage <= 1}
                  className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm text-neutral-600">
                  Page <strong className="text-neutral-900">{eventsPage}</strong> of{' '}
                  <strong className="text-neutral-900">{eventsTotalPages}</strong>
                </span>
                <button
                  onClick={() => setEventsPage((p) => Math.min(eventsTotalPages, p + 1))}
                  disabled={eventsPage >= eventsTotalPages}
                  className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
          )
        ) : activeTab === 'tickets' ? (
          isTicketsLoading ? (
            <div className="space-y-5">
              <SectionLoader
                title="Refreshing tickets"
                message="Updating your ticket list and status changes."
              />
              <LoadingGrid variant="tickets" count={3} />
            </div>
          ) : (
          <div className="space-y-4">
            {recentPromotion && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Your waitlisted seat for{' '}
                <strong>
                  {typeof recentPromotion.eventId === 'object'
                    ? recentPromotion.eventId?.title || 'your event'
                    : 'your event'}
                </strong>{' '}
                has been confirmed. Your ticket is now ready to use.
                <button
                  onClick={() => setRecentPromotion(null)}
                  className="ml-3 rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: 'All' },
                { key: 'unused', label: 'Unused' },
                { key: 'waitlisted', label: 'Waitlisted' },
                { key: 'used', label: 'Used' },
                { key: 'cancelled', label: 'Cancelled' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setTicketsPage(1);
                    setTicketFilter(key);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    ticketFilter === key
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedAndFilteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket._id}
                  ticket={ticket}
                  onView={() => setPreviewTicket(ticket)}
                  onDownload={() => handleDownloadTicket(ticket.ticketId)}
                />
              ))}

              {/* Empty states */}
              {ticketsAll.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl border border-neutral-100 p-12 text-center">
                  <Ticket className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                  <p className="text-neutral-500">
                    You haven't registered for any events yet.
                  </p>
                  <button
                    onClick={() => setActiveTab('events')}
                    className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all"
                  >
                    Browse Events
                  </button>
                </div>
              ) : sortedAndFilteredTickets.length === 0 ? (
                <div className="col-span-full bg-white rounded-2xl border border-neutral-100 p-12 text-center">
                  <p className="text-neutral-600">No tickets match this filter right now.</p>
                  <p className="mt-2 text-sm text-neutral-500">
                    Saved ticket filters stay active until you change them.
                  </p>
                  <button
                    onClick={() => setTicketFilter('all')}
                    className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all"
                  >
                    Show All Tickets
                  </button>
                </div>
              ) : null}

              {/* Pagination */}
              {ticketsTotalPages > 1 && ticketsAll.length > 0 && (
                <div className="col-span-full flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => setTicketsPage((p) => Math.max(1, p - 1))}
                    disabled={ticketsPage <= 1}
                    className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="text-sm text-neutral-600">
                    Page <strong className="text-neutral-900">{ticketsPage}</strong> of{' '}
                    <strong className="text-neutral-900">{ticketsTotalPages}</strong>
                  </span>
                  <button
                    onClick={() => setTicketsPage((p) => Math.min(ticketsTotalPages, p + 1))}
                    disabled={ticketsPage >= ticketsTotalPages}
                    className="px-4 py-2 rounded-xl bg-white border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
          )
        ) : (
          isCertificatesLoading ? (
            <div className="space-y-5">
              <SectionLoader
                title="Refreshing certificates"
                message="Checking for your latest issued certificates."
              />
              <LoadingGrid variant="cards" count={3} />
            </div>
          ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {certificates.map((certificate) => (
              <CertificateCard
                key={certificate._id}
                certificate={certificate}
                onDownload={() => handleDownloadCertificate(certificate.certificateId)}
                onPreview={() => setPreviewCertificate(certificate)}
              />
            ))}
            {certificates.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-neutral-100 p-12 text-center">
                <p className="text-neutral-500">
                  No certificates yet. Attend events to earn certificates!
                </p>
              </div>
            )}
          </div>
          )
        )}
      </main>

      {/* Certificate Preview Modal */}
      {previewCertificate && (
        <CertificatePreviewModal
          certificateId={previewCertificate.certificateId}
          eventTitle={
            typeof previewCertificate.eventId === 'string'
              ? 'Certificate'
              : previewCertificate.eventId?.title || 'Certificate'
          }
          onClose={() => setPreviewCertificate(null)}
          onDownload={() => {
            handleDownloadCertificate(previewCertificate.certificateId);
            setPreviewCertificate(null);
          }}
        />
      )}

      {/* Ticket Preview Modal */}
      {previewTicket && (
        <TicketPreviewModal
          ticketId={previewTicket.ticketId}
          eventTitle={
            typeof previewTicket.eventId === 'string'
              ? 'Event Ticket'
              : previewTicket.eventId?.title || 'Event Ticket'
          }
          onClose={() => setPreviewTicket(null)}
          onDownload={() => {
            handleDownloadTicket(previewTicket.ticketId);
            setPreviewTicket(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, onClick, isActive }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full border p-5 flex items-center gap-4 transition-all text-left group rounded-[1.75rem] shadow-sm ${
        isActive 
          ? 'border-neutral-900 bg-neutral-900 text-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]' 
          : 'border-white/70 bg-white/90 hover:-translate-y-0.5 hover:border-neutral-200 hover:shadow-md'
      }`}
    >
      <div className={`p-3 rounded-xl transition-colors ${
        isActive ? 'bg-white/10 text-white' : 'bg-neutral-100 text-neutral-700 group-hover:bg-sky-50 group-hover:text-sky-700'
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className={`text-3xl font-bold ${isActive ? 'text-white' : 'text-neutral-900'}`}>{value}</p>
        <p className={`text-sm ${isActive ? 'text-slate-200' : 'text-neutral-500'}`}>{label}</p>
      </div>
      <ChevronRight className={`h-5 w-5 transition-all ${
        isActive ? 'text-white' : 'text-neutral-300 group-hover:text-neutral-500'
      }`} />
    </button>
  );
}

function QuickHighlight({ value, label, helper }: { value: number | string; label: string; helper: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{label}</p>
      <p className="mt-2 text-xs leading-5 text-slate-300">{helper}</p>
    </div>
  );
}

function EventCard({ event, isRegistered, isRegistering, onRegister }: any) {
  const bannerUrl = getImageUrl(event.bannerUrl);
  const waitlistCount = event.waitlistCount ?? 0;
  
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/95 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
      {/* Event Banner Image */}
      <div className="h-40 w-full overflow-hidden">
        {bannerUrl ? (
          <AsyncImage
            src={bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            fallback={
              <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                <Calendar className="h-12 w-12 text-neutral-400" />
              </div>
            }
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
            <Calendar className="h-12 w-12 text-neutral-400" />
          </div>
        )}
      </div>
      
      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">{event.eventType}</span>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">{event.department}</span>
        </div>
        <h3 className="font-semibold text-lg text-neutral-900 mb-1 line-clamp-1">{event.title}</h3>
        
        <div className="space-y-2 text-sm text-neutral-600 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-neutral-400" />
            {formatDate(event.date, { weekday: undefined })}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-neutral-400" />
            {event.time}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-neutral-400" />
            <span className="line-clamp-1">{event.venue}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-400" />
            {event.seatsAvailable} seats available
          </div>
          {event.waitlistEnabled && waitlistCount > 0 && (
            <div className="flex items-center gap-2 text-amber-600">
              <Users className="h-4 w-4 text-amber-500" />
              {waitlistCount} on waitlist
            </div>
          )}
        </div>

        {isRegistered ? (
          <button disabled className="w-full py-2.5 rounded-xl font-medium bg-neutral-100 text-neutral-700">
            Already Joined
          </button>
        ) : event.seatsAvailable > 0 ? (
          <button
            onClick={onRegister}
            disabled={isRegistering}
            className="w-full py-2.5 rounded-xl font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isRegistering ? 'Registering…' : 'Register Now'}
          </button>
        ) : event.waitlistEnabled ? (
          <button
            onClick={onRegister}
            disabled={isRegistering}
            className="w-full py-2.5 rounded-xl font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-50"
          >
            {isRegistering ? 'Joining waitlist...' : 'Join Waitlist'}
          </button>
        ) : (
          <button disabled className="w-full py-2.5 rounded-xl font-medium bg-neutral-100 text-neutral-400">
            Sold Out
          </button>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket, onView, onDownload }: any) {
  const event = typeof ticket.eventId === 'object' ? ticket.eventId : null;
  const hasEvent = !!event;
  const bannerUrl = getImageUrl(event?.bannerUrl);

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/95 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
      {/* Event Banner */}
      <div className="h-32 w-full overflow-hidden relative">
        {bannerUrl ? (
          <AsyncImage
            src={bannerUrl}
            alt={event?.title || 'Event banner'}
            loading="lazy"
            className="w-full h-full object-cover"
            fallback={
              <div className="w-full h-full bg-neutral-100 flex flex-col items-center justify-center text-center px-4">
                <Ticket className="h-10 w-10 text-neutral-400" />
                <p className="mt-2 text-xs text-neutral-500">No banner available</p>
              </div>
            }
          />
        ) : (
          <div className="w-full h-full bg-neutral-100 flex flex-col items-center justify-center text-center px-4">
            <Ticket className="h-10 w-10 text-neutral-400" />
            <p className="mt-2 text-xs text-neutral-500">No banner available</p>
          </div>
        )}

        {/* Status Badge */}
        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm backdrop-blur-sm ${getStatusColor(ticket.status)}`}>
          {ticket.status.toUpperCase()}
        </span>
      </div>

      <div className="p-4">
        {/* Event Title */}
        <h3 className="font-semibold text-neutral-900 mb-2 line-clamp-1">
          {hasEvent ? event.title : 'Event deleted'}
        </h3>

        {/* Event Details (hide if event missing/deleted) */}
        {hasEvent && (
          <div className="space-y-1.5 text-sm text-neutral-600 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-400" />
              <span>{event?.date && formatDate(event.date, { weekday: undefined })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-neutral-400" />
              <span>{event?.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-neutral-400" />
              <span className="line-clamp-1">{event?.venue}</span>
            </div>
          </div>
        )}

        {/* Ticket ID */}
        <p className="text-xs font-mono text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-xl mb-4 text-center">
          {ticket.ticketId}
        </p>

        {ticket.status === 'waitlisted' && (
          <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
            This ticket is on the waitlist and will be promoted automatically if a seat opens.
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onView}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-all text-sm"
          >
            <Eye className="h-4 w-4" />
            View
          </button>
          <button
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all text-sm"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

function CertificateCard({ certificate, onDownload, onPreview }: any) {
  const event = certificate.eventId;

  return (
    <div className="rounded-[1.75rem] border border-white/70 bg-white/95 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
      {/* Certificate Icon Header */}
      <div className="flex items-center justify-center mb-4">
        <div className="p-3 rounded-full bg-emerald-50 text-emerald-700">
          <Award className="h-8 w-8" />
        </div>
      </div>
      
      {/* Content */}
      <div className="text-center">
        <h3 className="font-semibold text-lg text-neutral-900 mb-1">
          {event?.title || 'Event Certificate'}
        </h3>
        <p className="text-sm text-neutral-600 mb-1">
          {event?.department}
        </p>
        <p className="text-xs text-neutral-500 mb-4">
          {event?.date && formatDate(event.date, { weekday: undefined })}
        </p>
        
        {/* Certificate ID */}
        <p className="text-xs font-mono text-neutral-600 bg-neutral-100 px-3 py-1 rounded-full inline-block mb-4">
          {certificate.certificateId}
        </p>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-all"
        >
          <FileText className="h-4 w-4" />
          Preview
        </button>
        <button
          onClick={onDownload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </div>
    </div>
  );
}
