import { WifiOff, RefreshCw, Ticket } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <Ticket className="h-8 w-8 text-neutral-700" />
          <span className="text-2xl font-semibold text-neutral-900">UniEvent</span>
        </div>

        {/* Offline Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-neutral-100 mb-6">
          <WifiOff className="h-10 w-10 text-neutral-400" />
        </div>

        <h1 className="text-2xl font-semibold text-neutral-900 mb-3">
          You're offline
        </h1>
        
        <p className="text-neutral-600 mb-8 leading-relaxed">
          It looks like you've lost your internet connection. 
          Some features may be unavailable until you're back online.
        </p>

        {/* Retry Button */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 btn-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>

        {/* Tips */}
        <div className="mt-10 p-4 bg-white rounded-xl border border-neutral-100 text-left">
          <p className="text-sm font-medium text-neutral-700 mb-2">While offline, you can:</p>
          <ul className="text-sm text-neutral-600 space-y-1.5">
            <li>• View previously loaded tickets</li>
            <li>• Access downloaded PDFs</li>
            <li>• Check saved event details</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
