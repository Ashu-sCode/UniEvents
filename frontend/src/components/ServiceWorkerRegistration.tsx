'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui';

export function ServiceWorkerRegistration() {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);

          // Check for updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New update available
                    setShowUpdatePrompt(true);
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.error('SW registration failed:', error);
        });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show install prompt after a delay (not immediately)
      setTimeout(() => {
        setShowInstallPrompt(true);
      }, 30000); // 30 seconds
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted install');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.waiting?.postMessage('skipWaiting');
        window.location.reload();
      });
    }
  };

  // Install prompt banner
  if (showInstallPrompt) {
    return (
      <div className="fixed bottom-0 inset-x-0 p-4 z-50 sm:bottom-4 sm:right-4 sm:left-auto sm:max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-neutral-100 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-neutral-100 rounded-xl">
              <Download className="h-5 w-5 text-neutral-700" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-neutral-900">Install UniEvent</p>
              <p className="text-sm text-neutral-600 mt-0.5">
                Add to home screen for quick access
              </p>
            </div>
            <button
              onClick={() => setShowInstallPrompt(false)}
              className="p-1 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="secondary"
              onClick={() => setShowInstallPrompt(false)}
              className="flex-1 text-sm"
            >
              Not now
            </Button>
            <Button onClick={handleInstall} className="flex-1 text-sm">
              Install
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Update prompt banner
  if (showUpdatePrompt) {
    return (
      <div className="fixed bottom-0 inset-x-0 p-4 z-50 sm:bottom-4 sm:right-4 sm:left-auto sm:max-w-sm">
        <div className="bg-neutral-900 rounded-2xl shadow-lg p-4 text-white">
          <p className="font-medium">Update available</p>
          <p className="text-sm text-neutral-300 mt-0.5">
            A new version of UniEvent is ready
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              variant="secondary"
              onClick={() => setShowUpdatePrompt(false)}
              className="flex-1 text-sm"
            >
              Later
            </Button>
            <button
              onClick={handleUpdate}
              className="flex-1 text-sm px-4 py-2 bg-white text-neutral-900 rounded-xl font-medium"
            >
              Update now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
