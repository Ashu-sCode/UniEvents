'use client';

import { useEffect, useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import { certificatesAPI } from '@/lib/api';

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

  // Fetch PDF with auth and create blob URL
  useEffect(() => {
    const fetchPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch the PDF using the API (which includes auth headers)
        const response = await certificatesAPI.preview(certificateId);
        
        // Create blob URL from the response
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        console.error('Failed to load certificate preview:', err);
        setError(err.response?.data?.message || 'Failed to load certificate preview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPdf();

    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [certificateId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl h-[80vh] md:h-[85vh] bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Certificate Preview</h2>
            <p className="text-sm text-neutral-600">{eventTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PDF Preview */}
        <div className="flex-1 bg-neutral-100 overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p>Loading certificate...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 text-neutral-500 p-8 text-center">
              <p className="text-red-500">{error}</p>
              <button
                onClick={onDownload}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all"
              >
                <Download className="h-4 w-4" />
                Download Instead
              </button>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={`Certificate for ${eventTitle}`}
            />
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-white">
          <p className="text-xs font-mono text-neutral-500">{certificateId}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-xl font-medium hover:bg-neutral-200 transition-all"
            >
              Close
            </button>
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-all"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
