'use client';

import type { ReactNode } from 'react';
import { Building2, Calendar, Clock, MapPin, QrCode, Ticket as TicketIcon, User } from 'lucide-react';
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

const statusStyles = {
  unused: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  used: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function TicketCard({ ticket, compact = false, className }: TicketCardProps) {
  const event = ticket.eventId;
  const user = ticket.userId;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <div
      className={cn(
        'relative mx-auto max-w-md overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.10)]',
        className
      )}
    >
      <div className="absolute inset-y-[46%] left-0 z-10 h-9 w-5 -translate-x-1/2 rounded-full bg-[#eef2f7]" />
      <div className="absolute inset-y-[46%] right-0 z-10 h-9 w-5 translate-x-1/2 rounded-full bg-[#eef2f7]" />

      <div className="bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#14532d_100%)] px-6 py-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
            <TicketIcon className="h-3.5 w-3.5" />
            UniEvent pass
          </div>
          <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]', statusStyles[ticket.status])}>
            {ticket.status}
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-semibold leading-tight">{event.title}</h2>
        <p className="mt-2 text-sm text-slate-300">Movie-ticket inspired entry pass with QR verification.</p>
      </div>

      <div className="border-b border-dashed border-neutral-200 px-6 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Date" value={formatDate(event.date)} icon={<Calendar className="h-4 w-4 text-neutral-400" />} />
          <Detail label="Time" value={event.time} icon={<Clock className="h-4 w-4 text-neutral-400" />} />
          <Detail label="Venue" value={event.venue} icon={<MapPin className="h-4 w-4 text-neutral-400" />} />
          <Detail label="Department" value={user.department} icon={<Building2 className="h-4 w-4 text-neutral-400" />} />
        </div>
      </div>

      <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-3">
          <div className="rounded-[1.35rem] border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Attendee</p>
            <div className="mt-2 flex items-center gap-2">
              <User className="h-4 w-4 text-neutral-400" />
              <p className="font-semibold text-neutral-900">{user.name}</p>
            </div>
            {user.rollNumber ? (
              <p className="mt-2 font-mono text-sm text-neutral-600">{user.rollNumber}</p>
            ) : null}
          </div>

          <div className="rounded-[1.35rem] border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">Ticket ID</p>
            <p className="mt-2 font-mono text-sm text-neutral-800">{ticket.ticketId}</p>
            <p className="mt-2 text-xs text-neutral-500">Show this QR at entry for verification.</p>
          </div>
        </div>

        <div className="mx-auto flex flex-col items-center rounded-[1.5rem] border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            <QrCode className="h-3.5 w-3.5" />
            Scan to verify
          </div>
          <QRCodeSVG value={ticket.ticketId} size={compact ? 112 : 148} level="H" includeMargin={false} />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-neutral-200 bg-neutral-50 px-4 py-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-neutral-800">{value || '-'}</p>
    </div>
  );
}
