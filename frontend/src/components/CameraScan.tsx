'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

interface CameraScanProps {
  onScan: (ticketId: string) => void;
  onClose: () => void;
}

type ScanStatus = 'starting' | 'scanning' | 'success' | 'error';

export default function CameraScan({ onScan, onClose }: CameraScanProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('starting');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasStartedRef = useRef(false); // 🔥 prevents double init

  useEffect(() => {
    startCamera();
    return () => stopScanner();
  }, []);

  const startCamera = async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    setError(null);
    setStatus('starting');

    await new Promise(r => setTimeout(r, 100));

    try {
      scannerRef.current = new Html5Qrcode('qr-reader');

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      try {
        await scannerRef.current.start(
          { facingMode: 'environment' },
          config,
          handleScanSuccess,
          () => {}
        );
      } catch {
        await scannerRef.current.start(
          { facingMode: 'user' },
          config,
          handleScanSuccess,
          () => {}
        );
      }

      setStatus('scanning');
    } catch (err: any) {
      setStatus('error');

      let msg = 'Could not access camera. ';
      if (err.message?.includes('Permission')) {
        msg += 'Allow camera permission.';
      } else if (err.message?.includes('NotFound')) {
        msg += 'No camera found.';
      } else if (err.message?.includes('NotReadable')) {
        msg += 'Camera is in use.';
      } else {
        msg += 'Try again.';
      }

      setError(msg);
    }
  };

  const stopScanner = async () => {
    hasStartedRef.current = false;

    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === 2) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    stopScanner();
    setStatus('success');

    let ticketId = decodedText;

    if (decodedText.includes('/')) {
      ticketId = decodedText.split('/').pop() || decodedText;
    }

    if (ticketId.includes('?')) {
      ticketId = ticketId.split('?')[0];
    }

    setTimeout(() => {
      onScan(ticketId.trim());
    }, 300);
  };

  const handleRetry = () => {
    stopScanner();
    startCamera();
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-lg"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md">
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 text-white"
        >
          <X />
        </button>

        <div className="bg-neutral-900 border border-white/20 rounded-2xl p-4">
          <h2 className="text-white text-center text-lg mb-4">
            Scan QR Code
          </h2>

          {/* Scanner */}
          <div className="relative">
            <div
              id="qr-reader"
              className="w-full aspect-square rounded-2xl overflow-hidden"
            />

            {/* Success Overlay */}
            {status === 'success' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-2xl">
                <CheckCircle className="text-white w-12 h-12" />
              </div>
            )}

            {/* Loading */}
            {status === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                <RefreshCw className="animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-500/10 p-3 rounded-xl text-sm text-red-400">
              <div className="flex gap-2">
                <AlertCircle />
                <span>{error}</span>
              </div>

              <button
                onClick={handleRetry}
                className="mt-2 px-3 py-1 bg-white text-black rounded"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        #qr-reader video {
          border-radius: 16px !important;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
}