'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { eventsAPI, ticketsAPI } from '@/lib/api';
import { formatDate, getStatusColor, downloadBlob } from '@/lib/utils';
import { 
  Calendar, Ticket, Award, LogOut, Search, 
  MapPin, Clock, Users, Download, QrCode 
} from 'lucide-react';
import type { Event, Ticket as TicketType } from '@/types';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'tickets'>('events');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [eventsRes, ticketsRes] = await Promise.all([
        eventsAPI.getAll({ upcoming: 'true' }),
        ticketsAPI.getMyTickets(),
      ]);
      setEvents(eventsRes.data.data.events);
      setTickets(ticketsRes.data.data.tickets);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (eventId: string) => {
    try {
      await ticketsAPI.register(eventId);
      fetchData(); // Refresh data
    } catch (error: any) {
      alert(error.response?.data?.message || 'Registration failed');
    }
  };

  const handleDownloadTicket = async (ticketId: string) => {
    try {
      const response = await ticketsAPI.download(ticketId);
      downloadBlob(response.data, `ticket-${ticketId}.pdf`);
    } catch (error) {
      alert('Failed to download ticket');
    }
  };

  const isRegistered = (eventId: string) => {
    return tickets.some(t => {
      const eId = typeof t.eventId === 'string' ? t.eventId : t.eventId._id;
      return eId === eventId;
    });
  };

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
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label="Upcoming Events"
            value={events.length}
          />
          <StatCard
            icon={<Ticket className="h-5 w-5" />}
            label="My Tickets"
            value={tickets.length}
          />
          <StatCard
            icon={<Award className="h-5 w-5" />}
            label="Certificates"
            value={0}
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-3 mb-8">
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
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-16 text-neutral-500">Loading...</div>
        ) : activeTab === 'events' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                isRegistered={isRegistered(event._id)}
                onRegister={() => handleRegister(event._id)}
              />
            ))}
            {events.length === 0 && (
              <p className="text-neutral-500 col-span-3 text-center py-16">
                No upcoming events available.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket._id}
                ticket={ticket}
                onDownload={() => handleDownloadTicket(ticket.ticketId)}
              />
            ))}
            {tickets.length === 0 && (
              <p className="text-neutral-500 text-center py-16">
                You haven't registered for any events yet.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: any) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 flex items-center gap-4">
      <div className="p-3 rounded-xl bg-neutral-100 text-neutral-700">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-neutral-900">{value}</p>
        <p className="text-sm text-neutral-600">{label}</p>
      </div>
    </div>
  );
}

function EventCard({ event, isRegistered, onRegister }: any) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 hover:border-neutral-200 transition-all">
      <h3 className="font-semibold text-lg text-neutral-900 mb-2">{event.title}</h3>
      <p className="text-sm text-neutral-600 mb-4 line-clamp-2 leading-relaxed">{event.description}</p>
      
      <div className="space-y-2.5 text-sm text-neutral-600 mb-5">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-neutral-400" />
          {formatDate(event.date, { weekday: undefined })}
        </div>
        <div className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-neutral-400" />
          {event.time}
        </div>
        <div className="flex items-center gap-2.5">
          <MapPin className="h-4 w-4 text-neutral-400" />
          {event.venue}
        </div>
        <div className="flex items-center gap-2.5">
          <Users className="h-4 w-4 text-neutral-400" />
          {event.seatsAvailable} seats available
        </div>
      </div>

      {isRegistered ? (
        <button disabled className="btn-success w-full">
          ✓ Registered
        </button>
      ) : event.seatsAvailable > 0 ? (
        <button onClick={onRegister} className="btn-primary w-full">
          Register Now
        </button>
      ) : (
        <button disabled className="btn-secondary w-full opacity-60">
          Sold Out
        </button>
      )}
    </div>
  );
}

function TicketCard({ ticket, onDownload }: any) {
  const event = ticket.eventId;

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h3 className="font-semibold text-lg text-neutral-900">{event?.title || 'Event'}</h3>
        <p className="text-sm text-neutral-600 mt-1">
          {event?.date && formatDate(event.date)} at {event?.time}
        </p>
        <p className="text-sm text-neutral-600">{event?.venue}</p>
        <div className="mt-3">
          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
            {ticket.status.toUpperCase()}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onDownload}
          className="btn-secondary flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </div>
    </div>
  );
}
