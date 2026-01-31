'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { eventsAPI } from '@/lib/api';
import { getImageUrl, isValidImageType } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import type { Event } from '@/types';

const DEPARTMENT_OPTIONS = [
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electronics',
  'Information Technology',
  'MBA',
  'Other',
];

interface EditEventModalProps {
  event: Event;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEventModal({ event, onClose, onSuccess }: EditEventModalProps) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'public' as 'public' | 'departmental',
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
  const [isFetching, setIsFetching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fetch latest event data (ensures form is pre-filled from source of truth)
  useEffect(() => {
    let isMounted = true;

    const applyEventToForm = (e: Event) => {
      // Format date for input (YYYY-MM-DD)
      const eventDate = new Date(e.date);
      const formattedDate = eventDate.toISOString().split('T')[0];

      setFormData({
        title: e.title || '',
        description: e.description || '',
        eventType: e.eventType || 'public',
        department: e.department || '',
        seatLimit: e.seatLimit || 100,
        date: formattedDate,
        time: e.time || '',
        venue: e.venue || '',
        enableCertificates: e.enableCertificates || false,
      });

      setBannerFile(null);
      setBannerPreview(e.bannerUrl ? getImageUrl(e.bannerUrl) : null);
    };

    const fetchLatest = async () => {
      setIsFetching(true);
      try {
        // Optimistic prefill from provided event, then refresh from API
        applyEventToForm(event);

        const res = await eventsAPI.getById(event._id);
        const latest = res.data?.data?.event as Event | undefined;
        if (isMounted && latest) applyEventToForm(latest);
      } catch (err: any) {
        // Don't block editing if fetch fails
        if (isMounted) {
          toast.warning('Could not refresh event details. Showing cached values.');
          applyEventToForm(event);
        }
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    fetchLatest();

    return () => {
      isMounted = false;
    };
  }, [event, toast]);

  // Handle escape key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && !isFetching) onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, isLoading, isFetching]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && !isLoading && !isFetching) onClose();
  };

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
    setIsLoading(true);

    try {
      // Use FormData if there's a new banner image
      if (bannerFile) {
        const formDataObj = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
          formDataObj.append(key, String(value));
        });
        formDataObj.append('banner', bannerFile);
        await eventsAPI.update(event._id, formDataObj);
      } else {
        await eventsAPI.update(event._id, formData);
      }
      
      toast.success('Event updated successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 pt-20 sm:pt-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl my-auto animate-in zoom-in-95 duration-200">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Edit Event</h2>
            <button
              onClick={onClose}
              disabled={isLoading || isFetching}
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Event Title */}
            <div>
              <label className="label">Event Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                required
                disabled={isLoading || isFetching}
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input min-h-[100px]"
                required
                disabled={isLoading || isFetching}
              />
            </div>

            {/* Event Type & Department */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Event Type</label>
                <select
                  value={formData.eventType}
                  onChange={(e) => setFormData({ ...formData, eventType: e.target.value as 'public' | 'departmental' })}
                  className="input"
                  disabled={isLoading || isFetching}
                >
                  <option value="public">Public</option>
                  <option value="departmental">Department Only</option>
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="input"
                  required
                  disabled={isLoading || isFetching}
                >
                  {formData.department && !DEPARTMENT_OPTIONS.includes(formData.department) && (
                    <option value={formData.department}>{formData.department}</option>
                  )}
                  <option value="">Select Department</option>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date, Time, Seat Limit */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input"
                  required
                  disabled={isLoading || isFetching}
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
                  disabled={isLoading || isFetching}
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
                  disabled={isLoading || isFetching}
                />
              </div>
            </div>

            {/* Venue */}
            <div>
              <label className="label">Location / Venue</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="input"
                required
                disabled={isLoading || isFetching}
              />
            </div>

            {/* Banner Image Upload */}
            <div>
              <label className="label">Event Banner</label>
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
                    disabled={isLoading || isFetching}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50"
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
                    disabled={isLoading || isFetching}
                  />
                </label>
              )}
            </div>

            {/* Enable Certificates */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enableCertificates"
                checked={formData.enableCertificates}
                onChange={(e) => setFormData({ ...formData, enableCertificates: e.target.checked })}
                disabled={isLoading || isFetching}
              />
              <label htmlFor="enableCertificates" className="text-sm text-gray-700">
                Enable certificate generation (for workshops)
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || isFetching}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || isFetching}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
