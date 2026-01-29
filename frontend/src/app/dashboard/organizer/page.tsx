'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { eventsAPI, ticketsAPI, attendanceAPI, certificatesAPI } from '@/lib/api';
import { formatDate, getStatusColor, getImageUrl, isValidImageType } from '@/lib/utils';
import { 
  Calendar, Ticket, Users, LogOut, Plus, 
  QrCode, CheckCircle, XCircle, AlertCircle,
  BarChart3, Eye, Camera, Keyboard, Award, Image, Upload, X,
  Filter, ArrowUpDown, Trash2, Pencil, ChevronDown, MapPin
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

        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">My Events</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full sm:w-auto pl-10 pr-10 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent cursor-pointer"
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
              className="appearance-none w-full sm:w-auto pl-10 pr-10 py-2.5 bg-white border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent cursor-pointer"
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
          <div className="flex items-center text-sm text-neutral-500 sm:ml-auto">
            Showing {filteredEvents.length} of {events.length} events
          </div>
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
                  setSelectedEvent(event);
                  setShowScanModal(true);
                }}
                onRefresh={fetchEvents}
              />
            ))}
            {filteredEvents.length === 0 && events.length > 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-neutral-100 p-12 text-center">
                <p className="text-neutral-500">No events match your filter.</p>
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

function EventCard({ event, onScan, onRefresh }: any) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await eventsAPI.update(event._id, { status: newStatus });
      if (response.data.data.certificates) {
        const certResult = response.data.data.certificates;
        if (certResult.generated > 0) {
          alert(`Event marked as completed! ${certResult.generated} certificates generated.`);
        }
      }
      onRefresh();
    } catch (error) {
      alert('Failed to update event status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await eventsAPI.delete(event._id);
      onRefresh();
    } catch (error) {
      alert('Failed to delete event');
    } finally {
      setIsDeleting(false);
    }
  };

  const bannerUrl = getImageUrl(event.bannerUrl);

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden max-w-sm w-full hover:shadow-lg hover:scale-[1.02] transition-all">
      {/* Event Banner */}
      <div className="h-36 w-full overflow-hidden relative">
        {bannerUrl ? (
          <img 
            src={bannerUrl} 
            alt={event.title}
            className="w-full h-full object-cover"
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
        {/* Title */}
        <h3 className="font-semibold text-neutral-900 line-clamp-1 mb-2">{event.title}</h3>

        {/* Meta info */}
        <div className="space-y-1 text-sm text-neutral-600 mb-3">
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            {formatDate(event.date)} • {event.time}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-neutral-400" />
            <span className="line-clamp-1">{event.venue}</span>
          </p>
          <p className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-neutral-400" />
            <strong>{event.registeredCount}</strong> / {event.seatLimit} registered
          </p>
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
            onClick={() => alert('Edit feature coming soon')}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 py-2 px-2 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{isDeleting ? '...' : 'Delete'}</span>
          </button>
          <button
            className="flex-1 py-2 px-2 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-100 transition-all flex items-center justify-center gap-1.5"
            onClick={() => alert('View details coming soon')}
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">View</span>
          </button>
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
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isValidImageType(file)) {
        alert('Please select a valid image file (JPG, PNG, or WEBP)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
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
    setIsLoading(true);
    try {
      // Use FormData if there's a banner image
      if (bannerFile) {
        const formDataObj = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          formDataObj.append(key, String(value));
        });
        formDataObj.append('banner', bannerFile);
        await eventsAPI.create(formDataObj);
      } else {
        await eventsAPI.create(formData);
      }
      onSuccess();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
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

            {/* Banner Image Upload */}
            <div>
              <label className="label">Event Banner (Optional)</label>
              {bannerPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-neutral-200">
                  <img 
                    src={bannerPreview} 
                    alt="Banner preview" 
                    className="w-full h-40 object-cover"
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
                        {result.data.verification.attendee.rollNumber} • {result.data.verification.attendee.department}
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
