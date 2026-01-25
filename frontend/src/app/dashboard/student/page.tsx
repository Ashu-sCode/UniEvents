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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Ticket className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">UniEvent</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, <strong>{user?.name}</strong>
              </span>
              <button
                onClick={logout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<Calendar className="h-6 w-6" />}
            label="Upcoming Events"
            value={events.length}
            color="blue"
          />
          <StatCard
            icon={<Ticket className="h-6 w-6" />}
            label="My Tickets"
            value={tickets.length}
            color="green"
          />
          <StatCard
            icon={<Award className="h-6 w-6" />}
            label="Certificates"
            value={0}
            color="purple"
          />
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'events'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Browse Events
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'tickets'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            My Tickets
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : activeTab === 'events' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event._id}
                event={event}
                isRegistered={isRegistered(event._id)}
                onRegister={() => handleRegister(event._id)}
              />
            ))}
            {events.length === 0 && (
              <p className="text-gray-500 col-span-3 text-center py-12">
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
              <p className="text-gray-500 text-center py-12">
                You haven't registered for any events yet.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: any) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colors[color as keyof typeof colors]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600">{label}</p>
      </div>
    </div>
  );
}

function EventCard({ event, isRegistered, onRegister }: any) {
  return (
    <div className="card">
      <h3 className="font-semibold text-lg text-gray-900 mb-2">{event.title}</h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
      
      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {formatDate(event.date, { weekday: undefined })}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {event.time}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {event.venue}
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
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
        <button disabled className="btn-secondary w-full">
          Sold Out
        </button>
      )}
    </div>
  );
}

function TicketCard({ ticket, onDownload }: any) {
  const event = ticket.eventId;

  return (
    <div className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h3 className="font-semibold text-lg text-gray-900">{event?.title || 'Event'}</h3>
        <p className="text-sm text-gray-600">
          {event?.date && formatDate(event.date)} at {event?.time}
        </p>
        <p className="text-sm text-gray-600">{event?.venue}</p>
        <div className="mt-2">
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
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
