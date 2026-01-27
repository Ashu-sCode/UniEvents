'use client';

import { Ticket as TicketIcon, Calendar, Clock, MapPin, User, Hash, Building2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

interface TicketCardProps {
  ticket: {
    ticketId: string;
    status: 'unused' | 'used' | 'cancelled';
    eventId: {
      title: string;
      date: string;
      time: string;
      venue: string;
    };
    userId: {
      name: string;
      rollNumber?: string;
      department: string;
    };
  };
  compact?: boolean;
  className?: string;
}

export function TicketCard({ ticket, compact = false, className }: TicketCardProps) {
  const event = ticket.eventId;
  const user = ticket.userId;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const statusStyles = {
    unused: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    used: 'bg-neutral-100 text-neutral-600 border-neutral-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div
      className={cn(
        'relative bg-white rounded-2xl shadow-lg border border-neutral-100 overflow-hidden',
        'max-w-sm mx-auto',
        className
      )}
    >
      {/* Decorative notches */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-neutral-50 rounded-r-full -ml-2" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-neutral-50 rounded-l-full -mr-2" />

      {/* Header */}
      <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 px-6 py-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TicketIcon className="h-5 w-5 text-neutral-300" />
            <span className="text-sm font-medium text-neutral-300">UniEvent</span>
          </div>
          <span
            className={cn(
              'text-xs font-semibold px-2.5 py-1 rounded-full border',
              statusStyles[ticket.status]
            )}
          >
            {ticket.status.toUpperCase()}
          </span>
        </div>
        <h2 className="text-xl font-bold leading-tight">{event.title}</h2>
      </div>

      {/* Event Details */}
      <div className="px-6 py-4 border-b border-dashed border-neutral-200">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2.5">
            <Calendar className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Date</p>
              <p className="text-sm font-medium text-neutral-800">{formatDate(event.date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-neutral-500 uppercase tracking-wide">Time</p>
              <p className="text-sm font-medium text-neutral-800">{event.time}</p>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2.5 mt-3">
          <MapPin className="h-4 w-4 text-neutral-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wide">Venue</p>
            <p className="text-sm font-medium text-neutral-800">{event.venue}</p>
          </div>
        </div>
      </div>

      {/* Attendee Details */}
      <div className="px-6 py-4 border-b border-dashed border-neutral-200 bg-neutral-50/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <User className="h-4 w-4 text-neutral-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-neutral-800">{user.name}</span>
          </div>
          {user.rollNumber && (
            <div className="flex items-center gap-2.5">
              <Hash className="h-4 w-4 text-neutral-400 flex-shrink-0" />
              <span className="text-sm text-neutral-600">{user.rollNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-neutral-400 flex-shrink-0" />
            <span className="text-sm text-neutral-600">{user.department}</span>
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="px-6 py-5 flex flex-col items-center">
        <div className="bg-white p-3 rounded-xl border border-neutral-100 shadow-sm">
          <QRCodeSVG
            value={ticket.ticketId}
            size={compact ? 120 : 140}
            level="H"
            includeMargin={false}
          />
        </div>
        <p className="mt-3 text-xs font-mono text-neutral-500 tracking-wider">
          {ticket.ticketId}
        </p>
        <p className="mt-2 text-xs text-neutral-400 text-center">
          Show this ticket at entry
        </p>
      </div>
    </div>
  );
}
