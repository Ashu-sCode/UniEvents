'use client';

import { useEffect, useState } from 'react';
import { Award, Download, ShieldCheck, X } from 'lucide-react';

import { ModalPreviewLoader } from '@/components/ui';
import { certificatesAPI } from '@/lib/api';
import { getCachedPreviewUrl, setCachedPreviewUrl } from '@/lib/documentPreviewCache';

interface CertificatePreviewModalProps {
  certificateId: string;
  eventTitle: string;
  onClose: () => void;
  onDownload: () => void;
}

export default function CertificatePreviewModal({
  certificateId,
  eventTitle,
  onClose,
  onDownload,
}: CertificatePreviewModalProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPdf = async () => {
      const cached = getCachedPreviewUrl('certificate', certificateId);
      if (cached) {
        setPdfUrl(cached);
        setIsLoading(false);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await certificatesAPI.preview(certificateId);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setCachedPreviewUrl('certificate', certificateId, url);
        setPdfUrl(url);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load certificate preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPdf();
  }, [certificateId]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative flex h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-white/15 bg-neutral-950 shadow-[0_30px_100px_rgba(0,0,0,0.45)] xl:flex-row">
        <aside className="relative overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1f2937_45%,#7c2d12_100%)] p-6 text-white xl:w-[26rem] xl:border-b-0 xl:border-r">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_36%)]" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                  <Award className="h-3.5 w-3.5" />
                  Certificate preview
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">Certificate Preview</h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Review your certificate here before downloading or sharing it.
                </p>
              </div>
              <button
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/15"
                aria-label="Close certificate preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="rounded-[1.5rem] border border-amber-300/15 bg-white/5 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Issued for</p>
                <p className="mt-3 text-2xl font-semibold leading-snug text-white">{eventTitle}</p>
                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Certificate ID</p>
                    <p className="mt-2 font-mono text-sm text-white">{certificateId}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                      <ShieldCheck className="h-4 w-4 text-emerald-200" />
                      Verification ready
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Download the final PDF version for official use and record keeping.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col bg-[#f5f7fb]">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-white/80 px-5 py-4 backdrop-blur sm:px-6">
            <div>
              <p className="text-sm font-semibold text-neutral-900">Certificate document</p>
              <p className="text-sm text-neutral-500">Preview and download from the same workspace.</p>
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
                  title="Preparing certificate preview"
                  message="Fetching your certificate PDF."
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
                  title={`Certificate for ${eventTitle}`}
                />
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
