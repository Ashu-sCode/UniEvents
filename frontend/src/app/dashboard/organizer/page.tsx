'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { eventsAPI, ticketsAPI } from '@/lib/api';
import { formatDate, getStatusColor, getImageUrl, isValidImageType } from '@/lib/utils';
import {
  Calendar, Ticket, Users, Plus,
  QrCode, CheckCircle, XCircle,
  BarChart3, Eye, Camera, Keyboard, Award, Upload, X,
  Filter, ArrowUpDown, Trash2, Pencil, ChevronDown, MapPin
} from 'lucide-react';
import type { Event, EventStatus, EventType } from '@/types';
import CameraScan from '@/components/CameraScan';
import { DashboardNavbar } from '@/components/DashboardNavbar';
import { EditEventModal } from '@/components/EditEventModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AsyncImage, Button } from '@/components/ui';
import { STREAM_OPTIONS } from '@/constants/streams';

const ORGANIZER_FILTERS_STORAGE_KEY = 'unievent.organizer.filters';

export default function OrganizerDashboard() {
  const router = useRouter();
  const toast = useToast();
  const api = useApi();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedScanEvent, setSelectedScanEvent] = useState<Event | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditEvent, setSelectedEditEvent] = useState<Event | null>(null);

  // Delete confirmation modal state (kept at page-level to avoid nested fixed-modal glitches)
  const [deleteCandidate, setDeleteCandidate] = useState<Event | null>(null);
  const [isDeletingEvent, setIsDeletingEvent] = useState(false);
  
  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Filter and sort events
  const filteredEvents = events
    .filter(event => statusFilter === 'all' || event.status === statusFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime();
        case 'date_asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'date_desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
      }
    });

  useEffect(() => {
    try {
      const storedFilters = window.localStorage.getItem(ORGANIZER_FILTERS_STORAGE_KEY);
      if (storedFilters) {
        const parsed = JSON.parse(storedFilters) as { statusFilter?: string; sortBy?: string };
        setStatusFilter(parsed.statusFilter || 'all');
        setSortBy(parsed.sortBy || 'newest');
      }
    } catch {
      // Ignore malformed local preferences.
    }

    loadDashboard();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      ORGANIZER_FILTERS_STORAGE_KEY,
      JSON.stringify({ statusFilter, sortBy })
    );
  }, [sortBy, statusFilter]);

  const loadDashboard = async () => {
    try {
      const eventsResponse = await eventsAPI.getAll();
      setEvents(eventsResponse.data.data.events);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { message?: string } } };
      toast.error(apiError.response?.data?.message || 'Failed to load organizer dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;

    const toDelete = deleteCandidate;
    const previous = events;

    setIsDeletingEvent(true);

    await api.run(() => eventsAPI.delete(toDelete._id), {
      optimisticUpdate: () => {
        // Optimistic UI: remove immediately
        setEvents((prev) => prev.filter((e) => e._id !== toDelete._id));
      },
      rollback: () => {
        setEvents(previous);
      },
      successMessage: 'Event deleted successfully',
      errorMessage: (err) => err?.response?.data?.message || 'Failed to delete event',
      onSuccess: async () => {
        setDeleteCandidate(null);
        await loadDashboard();
      },
    });
    setIsDeletingEvent(false);
  };

  const hasActiveOrganizerFilters = statusFilter !== 'all' || sortBy !== 'newest';
  const totalRegistrations = events.reduce((sum, event) => sum + event.registeredCount, 0);
  const publishedCount = events.filter((event) => event.status === 'published').length;
  const draftCount = events.filter((event) => event.status === 'draft').length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dcfce7_0%,transparent_24%),radial-gradient(circle_at_top_right,#dbeafe_0%,transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_45%,#f8fafc_100%)]">
      <DashboardNavbar role="organizer" title="Operations Dashboard" subtitle="Manage events, registrations, and live activity" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-white/70 bg-[linear-gradient(135deg,#0f172a_0%,#1f2937_45%,#14532d_100%)] px-6 py-8 text-white shadow-[0_20px_70px_rgba(15,23,42,0.14)] sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
            <div>
              <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-sm font-medium text-emerald-100">
                Event operations command center
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                Run events with more clarity and less manual work.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                Publish campus events, manage seats and waitlists, verify entries, and keep registrations moving from one organizer workspace.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => router.push('/dashboard/organizer/analytics')}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                >
                  <BarChart3 className="h-4 w-4" />
                  View Analytics
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  <Plus className="h-4 w-4" />
                  Create Event
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <OrganizerHighlight value={publishedCount} label="Published" helper="Events currently open for registrations" />
              <OrganizerHighlight value={totalRegistrations} label="Registrations" helper="Confirmed signups across your events" />
              <OrganizerHighlight value={draftCount} label="Drafts" helper="Events still being prepared before publish" />
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label="Total Events"
            value={events.length}
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Registrations"
            value={totalRegistrations}
          />
          <StatCard
            icon={<Ticket className="h-5 w-5" />}
            label="Published"
            value={events.filter(e => e.status === 'published').length}
          />
          <StatCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Completed"
            value={events.filter(e => e.status === 'completed').length}
          />
        </div>

        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">My Events</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Manage publishing, ticket scanning, and event updates from one place.
            </p>
          </div>
          <div className="flex w-full sm:w-auto gap-3">
            <span className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-600">
              {filteredEvents.length} visible events
            </span>
          </div>
        </div>

        {/* Filter & Sort Controls */}
        <div className="mb-4 flex flex-col gap-3 rounded-[1.75rem] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:p-5">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-2xl border border-neutral-200/80 bg-white px-10 py-3 text-sm font-medium text-neutral-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-neutral-900/70 sm:w-auto"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-2xl border border-neutral-200/80 bg-white px-10 py-3 text-sm font-medium text-neutral-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:outline-none focus:ring-2 focus:ring-neutral-900/70 sm:w-auto"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="date_asc">Date (Ascending)</option>
              <option value="date_desc">Date (Descending)</option>
            </select>
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          </div>

          {/* Results count */}
          <div className="flex items-center rounded-full border border-neutral-200/80 bg-white px-3.5 py-2 text-sm text-neutral-500 sm:ml-auto">
            Showing {filteredEvents.length} of {events.length} events
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
          <span>Filters are saved on this device.</span>
          {hasActiveOrganizerFilters && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSortBy('newest');
              }}
              className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 font-medium text-neutral-700 transition hover:bg-neutral-100"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                onScan={() => {
                  setSelectedScanEvent(event);
                  setShowScanModal(true);
                }}
                onEdit={() => {
                  setSelectedEditEvent(event);
                  setShowEditModal(true);
                }}
                onDelete={() => setDeleteCandidate(event)}
                onView={() => router.push(`/dashboard/organizer/events/${event._id}`)}
                isDeleting={isDeletingEvent && deleteCandidate?._id === event._id}
                onSetStatus={(eventId: string, status: EventStatus) => {
                  setEvents((prev) => prev.map((e) => (e._id === eventId ? { ...e, status } : e)));
                }}
                onReplace={(eventId: string, patch: Partial<Event>) => {
                  setEvents((prev) => prev.map((e) => (e._id === eventId ? { ...e, ...patch } : e)));
                }}
              />
            ))}
            {filteredEvents.length === 0 && events.length > 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-neutral-100 p-12 text-center">
                <p className="text-neutral-700 font-medium">No events match your saved filters.</p>
                <p className="mt-2 text-sm text-neutral-500">Try clearing the status or sort preference to see more events.</p>
                <button
                  onClick={() => setStatusFilter('all')}
                  className="mt-4 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-all"
                >
                  Clear Filter
                </button>
              </div>
            )}
            {events.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-neutral-100 p-12 text-center">
                <Calendar className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <p className="text-neutral-500 mb-4">You haven't created any events yet.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all"
                >
                  Create Your First Event
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onOptimisticCreate={(tempEvent: Event) => {
            setEvents((prev) => [tempEvent, ...prev]);
          }}
          onCommitCreate={(tempId: string, realEvent: Event) => {
            setEvents((prev) => prev.map((e) => (e._id === tempId ? realEvent : e)));
          }}
          onRollbackCreate={(tempId: string) => {
            setEvents((prev) => prev.filter((e) => e._id !== tempId));
          }}
          onSuccess={async () => {
            setShowCreateModal(false);
            await loadDashboard();
          }}
        />
      )}

      {/* QR Scan Modal */}
      {showScanModal && selectedScanEvent && (
        <QRScanModal
          event={selectedScanEvent}
          onClose={() => setShowScanModal(false)}
        />
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEditEvent && (
        <EditEventModal
          event={selectedEditEvent}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadDashboard();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteCandidate}
        onClose={() => {
          if (isDeletingEvent) return;
          setDeleteCandidate(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete event"
        message="Are you sure you want to delete this event?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeletingEvent}
      />
    </div>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <div className="flex items-center gap-4 rounded-[1.75rem] border border-white/70 bg-white/90 p-6 shadow-sm">
      <div className="rounded-2xl bg-neutral-900 p-3 text-white">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-neutral-900">{value}</p>
        <p className="text-sm text-neutral-600">{label}</p>
      </div>
    </div>
  );
}

function OrganizerHighlight({ value, label, helper }: { value: number | string; label: string; helper: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-100">{label}</p>
      <p className="mt-2 text-xs leading-5 text-slate-300">{helper}</p>
    </div>
  );
}

// Skeleton loader for event cards
function EventCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden animate-pulse">
      <div className="h-40 w-full bg-neutral-200" />
      <div className="p-5">
        <div className="h-5 bg-neutral-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-neutral-100 rounded w-1/2 mb-2" />
        <div className="h-4 bg-neutral-100 rounded w-2/3 mb-4" />
        <div className="flex gap-2">
          <div className="h-8 bg-neutral-200 rounded-lg w-20" />
          <div className="h-8 bg-neutral-100 rounded-lg w-24" />
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, onScan, onEdit, onDelete, onView, isDeleting, onSetStatus, onReplace }: any) {
  const toast = useToast();
  const api = useApi();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: EventStatus) => {
    const prevStatus: EventStatus = event.status;

    setIsUpdating(true);

    await api.run(() => eventsAPI.update(event._id, { status: newStatus }), {
      optimisticUpdate: () => {
        onSetStatus?.(event._id, newStatus);
      },
      rollback: () => {
        onSetStatus?.(event._id, prevStatus);
      },
      successMessage: (response: any) => {
        const certResult = response.data?.data?.certificates;

        if (newStatus === 'published') return 'Event published';
        if (newStatus === 'completed') {
          if (certResult?.generated > 0) {
            return `Event completed - ${certResult.generated} certificates generated`;
          }
          return 'Event marked as completed';
        }

        return 'Event status updated';
      },
      errorMessage: (err) => err?.response?.data?.message || 'Failed to update event status',
      onSuccess: (response: any) => {
        const updatedEvent = response.data?.data?.event;
        if (updatedEvent) {
          onReplace?.(event._id, updatedEvent);
        }
      },
    });

    setIsUpdating(false);
  };


  const bannerUrl = getImageUrl(event.bannerUrl);

    return (
      <div className="max-w-sm w-full overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/95 shadow-sm transition-all hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
      {/* Event Banner */}
      <div className="h-36 w-full overflow-hidden relative">
        {bannerUrl ? (
          <AsyncImage
            src={bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover"
            fallback={
              <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-neutral-400" />
              </div>
            }
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
            <Calendar className="h-10 w-10 text-neutral-400" />
          </div>
        )}
        {/* Status Badge on Banner */}
        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getStatusColor(event.status)}`}>
          {event.status.toUpperCase()}
        </span>
      </div>
      
        <div className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">{event.status}</span>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">{event.department}</span>
          </div>
          {/* Title */}
          <h3 className="font-semibold text-neutral-900 line-clamp-1 mb-2">{event.title}</h3>

        {/* Meta info */}
        <div className="space-y-1 text-sm text-neutral-600 mb-3">
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            {formatDate(event.date)} · {event.time}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-neutral-400" />
            <span className="line-clamp-1">{event.venue}</span>
          </p>
          <p className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-neutral-400" />
            <strong>{event.registeredCount}</strong> / {event.seatLimit} registered
          </p>
          {event.waitlistEnabled && (event.waitlistCount ?? 0) > 0 && (
            <p className="flex items-center gap-2 text-amber-600">
              <Users className="h-3.5 w-3.5 text-amber-500" />
              {event.waitlistCount} waiting
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
            {event.eventType}
          </span>
          {event.enableCertificates && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 flex items-center gap-1">
              <Award className="h-3 w-3" />
              Certificates
            </span>
          )}
        </div>

        {/* Primary Actions */}
        <div className="flex flex-wrap gap-2 mb-3">
          {event.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('published')}
              disabled={isUpdating}
              className="flex-1 py-2 px-3 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-all disabled:opacity-50"
            >
              {isUpdating ? 'Publishing...' : 'Publish Event'}
            </button>
          )}
          {event.status === 'published' && (
            <>
              <button
                onClick={onScan}
                className="flex-1 py-2 px-3 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-1.5"
              >
                <QrCode className="h-4 w-4" />
                Scan
              </button>
              <button
                onClick={() => handleStatusChange('completed')}
                disabled={isUpdating}
                className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-700 text-sm font-medium rounded-xl hover:bg-neutral-200 transition-all"
              >
                {isUpdating ? '...' : 'Complete'}
              </button>
            </>
          )}
          {event.status === 'completed' && event.enableCertificates && (
            <span className="py-2 px-3 rounded-xl text-sm font-medium bg-neutral-100 text-neutral-700 flex items-center gap-1.5 w-full justify-center">
              <CheckCircle className="h-4 w-4" />
              Certificates Ready
            </span>
          )}
        </div>

        {/* Mobile Action Row - Edit / Delete / View */}
        <div className="flex gap-2 pt-3 border-t border-neutral-100">
          <button
            className="flex-1 py-2 px-2 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-100 transition-all flex items-center justify-center gap-1.5"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex-1 py-2 px-2 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isDeleting ? '...' : 'Delete'}</span>
          </button>
          <button
            className="flex-1 py-2 px-2 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-100 transition-all flex items-center justify-center gap-1.5"
            onClick={onView}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">View</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateEventModal({ onClose, onSuccess, onOptimisticCreate, onCommitCreate, onRollbackCreate }: any) {
  const toast = useToast();
  const api = useApi();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    eventType: EventType;
    department: string;
    seatLimit: number;
    date: string;
    time: string;
    venue: string;
    enableCertificates: boolean;
    waitlistEnabled: boolean;
  }>({
    title: '',
    description: '',
    eventType: 'public',
    department: '',
    seatLimit: 100,
    date: '',
    time: '',
    venue: '',
    enableCertificates: false,
    waitlistEnabled: true,
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isValidImageType(file)) {
        toast.error('Please select a valid image file (JPG, PNG, or WEBP)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const removeBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // Build a temporary event for optimistic UI.
    const tempEvent: any = {
      _id: tempId,
      id: tempId,
      title: formData.title,
      description: formData.description,
      organizerId: 'me',
      eventType: formData.eventType,
      department: formData.department,
      seatLimit: Number(formData.seatLimit) || 1,
      registeredCount: 0,
      date: formData.date,
      time: formData.time,
      venue: formData.venue,
      status: 'draft',
      bannerUrl: null,
      enableCertificates: !!formData.enableCertificates,
      seatsAvailable: Number(formData.seatLimit) || 1,
      isRegistrationOpen: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setIsLoading(true);

    const buildRequest = async () => {
      // Use FormData if there's a banner image
      if (bannerFile) {
        const formDataObj = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          formDataObj.append(key, String(value));
        });
        formDataObj.append('banner', bannerFile);
        return eventsAPI.create(formDataObj);
      }
      return eventsAPI.create(formData);
    };

    await api.run(buildRequest, {
      optimisticUpdate: () => {
        onOptimisticCreate?.(tempEvent);
      },
      rollback: () => {
        onRollbackCreate?.(tempId);
      },
      successMessage: 'Event created successfully',
      errorMessage: (err) => err?.response?.data?.message || 'Failed to create event',
      onSuccess: (res: any) => {
        const created = res.data?.data?.event;
        if (created) {
          onCommitCreate?.(tempId, created);
        } else {
          onRollbackCreate?.(tempId);
        }

        onSuccess();
      },
    });

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center z-50 p-4 pt-20 sm:pt-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-lg my-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Create New Event</h2>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Event Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input min-h-[100px]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Event Type</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value as EventType })}
                  className="input"
                >
                  <option value="public">Public</option>
                  <option value="departmental">Departmental</option>
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="input"
                  required
                >
                  <option value="">Select Department</option>
                  {STREAM_OPTIONS.map((stream) => (
                    <option key={stream.value} value={stream.value}>
                      {stream.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Seat Limit</label>
                <input
                  type="number"
                  value={formData.seatLimit}
                  onChange={(e) => setFormData({ ...formData, seatLimit: parseInt(e.target.value) })}
                  className="input"
                  min="1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Venue</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="input"
                required
              />
            </div>

            {/* Banner Image Upload */}
            <div>
              <label className="label">Event Banner (Optional)</label>
              {bannerPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-neutral-200">
                  <AsyncImage
                    src={bannerPreview}
                    alt="Banner preview"
                    className="w-full h-40 object-cover"
                    fallback={
                      <div className="flex h-40 items-center justify-center bg-neutral-100 text-sm text-neutral-500">
                        Banner preview unavailable
                      </div>
                    }
                  />
                  <button
                    type="button"
                    onClick={removeBanner}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer hover:border-neutral-400 hover:bg-neutral-50 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="h-10 w-10 text-neutral-400 mb-2" />
                    <p className="text-sm text-neutral-500">
                      <span className="font-medium text-neutral-700">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">PNG, JPG or WEBP (max 5MB)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                  />
                </label>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableCertificates"
                checked={formData.enableCertificates}
                onChange={(e) => setFormData({ ...formData, enableCertificates: e.target.checked })}
              />
              <label htmlFor="enableCertificates" className="text-sm text-gray-700">
                Enable certificate generation (for workshops)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="waitlistEnabled"
                checked={formData.waitlistEnabled}
                onChange={(e) => setFormData({ ...formData, waitlistEnabled: e.target.checked })}
              />
              <label htmlFor="waitlistEnabled" className="text-sm text-gray-700">
                Enable waitlist when seats are full
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <Button type="submit" isLoading={isLoading} disabled={isLoading} className="flex-1">
                Create Event
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function QRScanModal({ event, onClose }: any) {
  const [mode, setMode] = useState<'choose' | 'camera' | 'manual'>('choose');
  const [ticketId, setTicketId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (id: string) => {
    const cleanId = id.trim();
    if (!cleanId) return null;
    
    setIsVerifying(true);
    setResult(null);

    try {
      const response = await ticketsAPI.verify({
        ticketId: cleanId,
        eventId: event._id,
      });
      const nextResult = { success: true, data: response.data };
      setResult(nextResult);
      return nextResult;
    } catch (error: any) {
      const nextResult = { 
        success: false, 
        message: error.response?.data?.message || 'Verification failed',
        verification: error.response?.data?.verification
      };
      setResult(nextResult);
      return nextResult;
    } finally {
      setIsVerifying(false);
      setTicketId('');
    }
  };

  const handleScanResult = async (scannedId: string) => {
    const outcome = await handleVerify(scannedId) as
      | { success: true; data: { verification?: { attendee?: { name?: string; rollNumber?: string; department?: string } } } }
      | { success: false; message?: string; verification?: { reason?: string } }
      | null;

    if (outcome?.success) {
      const attendee = outcome.data?.verification?.attendee;
      return {
        success: true,
        title: 'Entry verified',
        message: attendee?.name
          ? `${attendee.name} has been checked in successfully.`
          : 'Ticket accepted and attendance recorded successfully.',
        details: attendee
          ? `${attendee.rollNumber || 'Roll number unavailable'} · ${attendee.department || 'Department unavailable'} · Student notified`
          : 'Attendance saved and the student has been notified.',
      };
    }

    return {
      success: false,
      title: 'Verification failed',
      message: outcome?.message || 'Verification failed',
      details: outcome?.verification?.reason
        ? `Reason: ${String(outcome.verification.reason).replaceAll('_', ' ')}`
        : 'Check the ticket and try again.',
    };
  };

  // Show Camera Scanner
  if (mode === 'camera') {
    return (
      <CameraScan
        onScan={handleScanResult}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">Verify Tickets</h2>
            <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-neutral-600 mb-6">
            Event: <strong className="text-neutral-900">{event.title}</strong>
          </p>

          {/* Mode Selection */}
          {mode === 'choose' && !result && (
            <div className="space-y-3 mb-4">
              <button
                onClick={() => setMode('camera')}
                className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-2xl transition-all hover:scale-[1.02]"
              >
                <Camera className="w-5 h-5" />
                <span className="font-medium">Scan QR Code</span>
              </button>
              
              <button
                onClick={() => setMode('manual')}
                className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-2xl transition-all"
              >
                <Keyboard className="w-5 h-5" />
                <span className="font-medium">Enter Ticket ID Manually</span>
              </button>
            </div>
          )}

          {/* Manual Entry Mode */}
          {mode === 'manual' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Enter Ticket ID</label>
              <input
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify(ticketId)}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl font-mono text-center focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent mb-3"
                placeholder="TKT-XXXXXXXX"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('choose')}
                  className="flex-1 py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => handleVerify(ticketId)}
                  disabled={isVerifying || !ticketId.trim()}
                  className="flex-1 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded-xl font-medium transition-colors"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mb-4">
              <div className={`p-4 rounded-2xl ${result.success ? 'bg-neutral-50 border border-neutral-200' : 'bg-neutral-50 border border-neutral-200'}`}>
                {result.success ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-neutral-900">Entry Verified!</p>
                      <p className="text-sm text-neutral-600">
                        {result.data.verification.attendee.name}
                      </p>
                      <p className="text-sm text-neutral-500">
                        {result.data.verification.attendee.rollNumber} · {result.data.verification.attendee.department}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <XCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-neutral-900">Verification Failed</p>
                      <p className="text-sm text-red-400">{result.message}</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setResult(null)}
                className="w-full mt-3 py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-medium transition-colors"
              >
                Scan Another Ticket
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


