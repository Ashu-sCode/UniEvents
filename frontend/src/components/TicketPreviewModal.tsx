'use client';

import { useEffect, useState } from 'react';
import { Download, Film, Ticket, X } from 'lucide-react';

import { ModalPreviewLoader } from '@/components/ui';
import { ticketsAPI } from '@/lib/api';
import { getCachedPreviewUrl, setCachedPreviewUrl } from '@/lib/documentPreviewCache';

interface TicketPreviewModalProps {
  ticketId: string;
  eventTitle: string;
  onClose: () => void;
  onDownload: () => void;
}

export default function TicketPreviewModal({
  ticketId,
  eventTitle,
  onClose,
  onDownload,
}: TicketPreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      const cached = getCachedPreviewUrl('ticket', ticketId);
      if (cached) {
        setPdfUrl(cached);
        setIsLoading(false);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await ticketsAPI.preview(ticketId);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setCachedPreviewUrl('ticket', ticketId, url);
        setPdfUrl(url);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load ticket preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPdf();
  }, [ticketId]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-neutral-950 shadow-[0_30px_100px_rgba(0,0,0,0.45)] lg:flex-row">
        <aside className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(160deg,#0f172a_0%,#111827_45%,#14532d_100%)] p-6 text-white lg:w-[24rem] lg:border-b-0 lg:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.24),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.18),transparent_38%)]" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
                  <Film className="h-3.5 w-3.5" />
                  Ticket preview
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">Event Ticket</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Keep this pass ready at the venue for quick verification and entry.
                </p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/15"
                aria-label="Close ticket preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative mt-8 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="absolute inset-y-0 left-0 my-auto h-10 w-5 -translate-x-1/2 rounded-full bg-neutral-950" />
              <div className="absolute inset-y-0 right-0 my-auto h-10 w-5 translate-x-1/2 rounded-full bg-neutral-950" />
              <div className="border-b border-dashed border-white/15 pb-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Ticket className="h-4 w-4 text-emerald-200" />
                    UniEvent Pass
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                    Admit one
                  </span>
                </div>
                <p className="mt-4 text-xl font-semibold leading-snug text-white">{eventTitle}</p>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Ticket ID</p>
                  <p className="mt-2 font-mono text-sm text-white">{ticketId}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Entry note</p>
                  <p className="mt-2 text-sm text-slate-200">Please present this QR code at the event entry desk.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col bg-[#f5f7fb]">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-white/80 px-5 py-4 backdrop-blur sm:px-6">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Ticket preview</p>
              <p className="text-sm text-neutral-500">View and download without leaving the dashboard.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
              >
                Close
              </button>
              <button
                onClick={onDownload}
                className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
            <div className="h-full w-full overflow-hidden rounded-[1.75rem] border border-neutral-200 bg-white shadow-sm">
              {isLoading ? (
                <ModalPreviewLoader
                  title="Preparing ticket preview"
                  message="Fetching your ticket PDF."
                />
              ) : error ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <p className="text-sm font-medium text-rose-600">{error}</p>
                  <button
                    onClick={onDownload}
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                  >
                    <Download className="h-4 w-4" />
                    Download Instead
                  </button>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="h-full w-full border-0"
                  title={`Ticket for ${eventTitle}`}
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
