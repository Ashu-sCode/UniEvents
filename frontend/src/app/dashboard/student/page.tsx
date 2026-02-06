'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useApi } from '@/hooks/useApi';
import { eventsAPI, ticketsAPI, certificatesAPI } from '@/lib/api';
import { formatDate, getStatusColor, downloadBlob, getImageUrl } from '@/lib/utils';
import {
  Calendar, Ticket, Award, LogOut,
  MapPin, Clock, Users, Download, FileText, Eye, ChevronRight, UserCircle
} from 'lucide-react';
import type { Event, Ticket as TicketType, Certificate } from '@/types';
import CertificatePreviewModal from '@/components/CertificatePreviewModal';
import TicketPreviewModal from '@/components/TicketPreviewModal';

export default function StudentDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const toast = useToast();
  const api = useApi();
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'tickets' | 'certificates'>('events');
  const [ticketFilter, setTicketFilter] = useState<'all' | 'unused' | 'used' | 'cancelled'>('all');
  const [previewCertificate, setPreviewCertificate] = useState<Certificate | null>(null);
  const [previewTicket, setPreviewTicket] = useState<TicketType | null>(null);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, ticketsRes, certificatesRes] = await Promise.all([
        eventsAPI.getAll({ upcoming: 'true' }),
        ticketsAPI.getMyTickets(),
        certificatesAPI.getMyCertificates(),
      ]);
      setEvents(eventsRes.data.data.events);
      setTickets(ticketsRes.data.data.tickets);
      setCertificates(certificatesRes.data.data.certificates || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (eventId: string) => {
    setRegisteringEventId(eventId);

    await api.run(() => ticketsAPI.register(eventId), {
      successMessage: 'Successfully registered for the event',
      errorMessage: (err) => err?.response?.data?.message || 'Registration failed',
      onSuccess: () => {
        fetchData(); // Refresh data
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
    return tickets.some(t => {
      // `t.eventId` can be a string, a populated event object, or null (e.g. if the event was deleted).
      const eId =
        typeof t.eventId === 'string'
          ? t.eventId
          : t.eventId?._id;

      return !!eId && eId === eventId;
    });
  };

  const sortedAndFilteredTickets = useMemo(() => {
    const filtered = ticketFilter === 'all'
      ? tickets
      : tickets.filter(t => t.status === ticketFilter);

    // Stable sort: keep original index as final tie-breaker
    const withIndex = filtered.map((t, idx) => ({ t, idx }));

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
  }, [tickets, ticketFilter]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2.5">
              <Ticket className="h-7 w-7 text-neutral-700" />
              <span className="text-xl font-semibold text-neutral-900">UniEvent</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-neutral-600">
                <strong className="text-neutral-900">{user?.name}</strong>
              </span>
              <button
                onClick={() => router.push('/dashboard/student/profile')}
                className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-700"
                aria-label="Profile"
                title="Profile"
              >
                <UserCircle className="h-5 w-5" />
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Stat Cards - Clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard
            icon={<Calendar className="h-6 w-6" />}
            label="Upcoming Events"
            value={events.length}
            onClick={() => setActiveTab('events')}
            isActive={activeTab === 'events'}
          />
          <StatCard
            icon={<Ticket className="h-6 w-6" />}
            label="My Tickets"
            value={tickets.length}
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

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'events'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            Browse Events
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'tickets'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            My Tickets
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
              activeTab === 'certificates'
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            Certificates
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : activeTab === 'events' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
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
              <p className="text-neutral-500 col-span-3 text-center py-16">
                No upcoming events available.
              </p>
            )}
          </div>
        ) : activeTab === 'tickets' ? (
          <div className="space-y-4">
            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {([
                { key: 'all', label: 'All' },
                { key: 'unused', label: 'Unused' },
                { key: 'used', label: 'Used' },
                { key: 'cancelled', label: 'Cancelled' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTicketFilter(key)}
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
              {tickets.length === 0 ? (
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
                  <p className="text-neutral-600">No tickets match this filter.</p>
                  <button
                    onClick={() => setTicketFilter('all')}
                    className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all"
                  >
                    Show All Tickets
                  </button>
                </div>
              ) : null}
            </div>
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

// Skeleton loaders for loading states
function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden animate-pulse">
      <div className="h-40 w-full bg-neutral-200" />
      <div className="p-5">
        <div className="h-5 bg-neutral-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-neutral-100 rounded w-1/2 mb-2" />
        <div className="h-4 bg-neutral-100 rounded w-2/3 mb-2" />
        <div className="h-4 bg-neutral-100 rounded w-1/2 mb-4" />
        <div className="h-10 bg-neutral-200 rounded-xl w-full" />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, onClick, isActive }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-2xl border p-5 flex items-center gap-4 transition-all text-left group ${
        isActive 
          ? 'border-neutral-900 shadow-md' 
          : 'border-neutral-100 hover:border-neutral-200 hover:shadow-md'
      }`}
    >
      <div className={`p-3 rounded-xl transition-colors ${
        isActive ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200'
      }`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-3xl font-bold text-neutral-900">{value}</p>
        <p className="text-sm text-neutral-500">{label}</p>
      </div>
      <ChevronRight className={`h-5 w-5 transition-all ${
        isActive ? 'text-neutral-900' : 'text-neutral-300 group-hover:text-neutral-500'
      }`} />
    </button>
  );
}

function EventCard({ event, isRegistered, isRegistering, onRegister }: any) {
  const bannerUrl = getImageUrl(event.bannerUrl);
  
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all">
      {/* Event Banner Image */}
      <div className="h-40 w-full overflow-hidden">
        {bannerUrl ? (
          <img 
            src={bannerUrl} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
            <Calendar className="h-12 w-12 text-neutral-400" />
          </div>
        )}
      </div>
      
      <div className="p-5">
        <h3 className="font-semibold text-lg text-neutral-900 mb-1 line-clamp-1">{event.title}</h3>
        <p className="text-xs text-neutral-500 mb-3">{event.department}</p>
        
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
        </div>

        {isRegistered ? (
          <button disabled className="w-full py-2.5 rounded-xl font-medium bg-neutral-100 text-neutral-700">
            ✓ Registered
          </button>
        ) : event.seatsAvailable > 0 ? (
          <button
            onClick={onRegister}
            disabled={isRegistering}
            className="w-full py-2.5 rounded-xl font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isRegistering ? 'Registering…' : 'Register Now'}
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
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all">
      {/* Event Banner */}
      <div className="h-32 w-full overflow-hidden relative">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={event?.title || 'Event banner'}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-neutral-100 flex flex-col items-center justify-center text-center px-4">
            <Ticket className="h-10 w-10 text-neutral-400" />
            <p className="mt-2 text-xs text-neutral-500">No banner available</p>
          </div>
        )}

        {/* Status Badge */}
        <span className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${getStatusColor(ticket.status)}`}>
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
        <p className="text-xs font-mono text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-lg mb-4 text-center">
          {ticket.ticketId}
        </p>

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
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 hover:shadow-lg hover:scale-[1.02] transition-all">
      {/* Certificate Icon Header */}
      <div className="flex items-center justify-center mb-4">
        <div className="p-3 rounded-full bg-neutral-100 text-neutral-700">
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
