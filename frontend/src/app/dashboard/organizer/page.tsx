'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { eventsAPI, ticketsAPI, attendanceAPI } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';
import { 
  Calendar, Ticket, Users, LogOut, Plus, 
  QrCode, CheckCircle, XCircle, AlertCircle,
  BarChart3, Eye, Camera, Keyboard
} from 'lucide-react';
import type { Event } from '@/types';
import CameraScan from '@/components/CameraScan';

export default function OrganizerDashboard() {
  const { user, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getAll();
      setEvents(response.data.data.events);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
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
              <span className="text-sm bg-neutral-100 text-neutral-700 px-2.5 py-1 rounded-lg font-medium">
                Organizer
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-neutral-600">
                <strong className="text-neutral-900">{user?.name}</strong> • {user?.department}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-10">
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            label="Total Events"
            value={events.length}
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Total Registrations"
            value={events.reduce((sum, e) => sum + e.registeredCount, 0)}
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

        {/* Actions */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="page-title">My Events</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="text-center py-16 text-neutral-500">Loading...</div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <EventRow
                key={event._id}
                event={event}
                onScan={() => {
                  setSelectedEvent(event);
                  setShowScanModal(true);
                }}
                onRefresh={fetchEvents}
              />
            ))}
            {events.length === 0 && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-12 text-center">
                <p className="text-neutral-500 mb-4">You haven't created any events yet.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
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
          onSuccess={() => {
            setShowCreateModal(false);
            fetchEvents();
          }}
        />
      )}

      {/* QR Scan Modal */}
      {showScanModal && selectedEvent && (
        <QRScanModal
          event={selectedEvent}
          onClose={() => setShowScanModal(false)}
        />
      )}
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

function EventRow({ event, onScan, onRefresh }: any) {
  const handleStatusChange = async (newStatus: string) => {
    try {
      await eventsAPI.update(event._id, { status: newStatus });
      onRefresh();
    } catch (error) {
      alert('Failed to update event status');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6">
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg text-neutral-900">{event.title}</h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
              {event.status.toUpperCase()}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
              {event.eventType}
            </span>
          </div>
          <p className="text-sm text-neutral-600 mb-2">
            {formatDate(event.date)} at {event.time} • {event.venue}
          </p>
          <p className="text-sm text-neutral-600">
            <strong>{event.registeredCount}</strong> / {event.seatLimit} registered
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {event.status === 'draft' && (
            <button
              onClick={() => handleStatusChange('published')}
              className="btn-success text-sm"
            >
              Publish
            </button>
          )}
          {event.status === 'published' && (
            <>
              <button
                onClick={onScan}
                className="btn-primary text-sm flex items-center gap-1"
              >
                <QrCode className="h-4 w-4" />
                Scan Tickets
              </button>
              <button
                onClick={() => handleStatusChange('completed')}
                className="btn-secondary text-sm"
              >
                Mark Complete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateEventModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'public',
    department: '',
    seatLimit: 100,
    date: '',
    time: '',
    venue: '',
    enableCertificates: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await eventsAPI.create(formData);
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Create New Event</h2>
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
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                  className="input"
                >
                  <option value="public">Public</option>
                  <option value="departmental">Departmental</option>
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="input"
                  required
                />
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

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn-primary flex-1">
                {isLoading ? 'Creating...' : 'Create Event'}
              </button>
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
    if (!cleanId) return;
    
    setIsVerifying(true);
    setResult(null);

    try {
      const response = await ticketsAPI.verify({
        ticketId: cleanId,
        eventId: event._id,
      });
      setResult({ success: true, data: response.data });
    } catch (error: any) {
      setResult({ 
        success: false, 
        message: error.response?.data?.message || 'Verification failed',
        verification: error.response?.data?.verification
      });
    } finally {
      setIsVerifying(false);
      setTicketId('');
    }
  };

  const handleScanResult = (scannedId: string) => {
    setMode('choose');
    handleVerify(scannedId);
  };

  // Show Camera Scanner
  if (mode === 'camera') {
    return (
      <CameraScan
        onScan={handleScanResult}
        onClose={() => setMode('choose')}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Verify Tickets</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            Event: <strong>{event.title}</strong>
          </p>

          {/* Mode Selection */}
          {mode === 'choose' && !result && (
            <div className="space-y-3 mb-4">
              <button
                onClick={() => setMode('camera')}
                className="w-full flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span className="font-medium">Scan QR Code</span>
              </button>
              
              <button
                onClick={() => setMode('manual')}
                className="w-full flex items-center justify-center gap-3 p-4 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <Keyboard className="w-5 h-5" />
                <span className="font-medium">Enter Ticket ID Manually</span>
              </button>
            </div>
          )}

          {/* Manual Entry Mode */}
          {mode === 'manual' && (
            <div className="mb-4">
              <label className="label">Enter Ticket ID</label>
              <input
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify(ticketId)}
                className="input font-mono mb-3"
                placeholder="TKT-XXXXXXXX"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setMode('choose')}
                  className="btn-secondary flex-1"
                >
                  Back
                </button>
                <button
                  onClick={() => handleVerify(ticketId)}
                  disabled={isVerifying || !ticketId.trim()}
                  className="btn-primary flex-1"
                >
                  {isVerifying ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mb-4">
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                {result.success ? (
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-800">Entry Verified!</p>
                      <p className="text-sm text-green-700">
                        {result.data.verification.attendee.name}
                      </p>
                      <p className="text-sm text-green-700">
                        {result.data.verification.attendee.rollNumber} • {result.data.verification.attendee.department}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-800">Verification Failed</p>
                      <p className="text-sm text-red-700">{result.message}</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setResult(null)}
                className="btn-primary w-full mt-3"
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
