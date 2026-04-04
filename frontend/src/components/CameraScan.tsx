'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  AlertCircle,
  CheckCircle,
  Flashlight,
  RefreshCw,
  ScanLine,
  X,
  XCircle,
} from 'lucide-react';

type ScanStatus = 'starting' | 'scanning' | 'processing' | 'success' | 'error';

export type ScanFeedback = {
  success: boolean;
  title: string;
  message: string;
  details?: string;
};

interface CameraScanProps {
  onScan: (ticketId: string) => Promise<ScanFeedback>;
  onClose: () => void;
}

export default function CameraScan({ onScan, onClose }: CameraScanProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('starting');
  const [torchOn, setTorchOn] = useState(false);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasStartedRef = useRef(false);
  const isHandlingScanRef = useRef(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const playBeep = () => {
    try {
      const context = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1040, context.currentTime);
      oscillator.connect(context.destination);
      oscillator.start();
      window.setTimeout(() => oscillator.stop(), 120);
    } catch {
      // Non-blocking audio enhancement only.
    }
  };

  const extractTicketId = (decodedText: string) => {
    let ticketId = decodedText;

    if (decodedText.includes('/')) {
      ticketId = decodedText.split('/').pop() || decodedText;
    }

    if (ticketId.includes('?')) {
      ticketId = ticketId.split('?')[0];
    }

    return ticketId.trim();
  };

  const stopScanner = async () => {
    hasStartedRef.current = false;

    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === 2) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch {
        // Scanner may already be stopped or cleared.
      }
      scannerRef.current = null;
    }

    videoTrackRef.current = null;
    setTorchOn(false);
  };

  const startCamera = async () => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    isHandlingScanRef.current = false;
    setCameraError(null);
    setFeedback(null);
    setStatus('starting');

    await new Promise((resolve) => window.setTimeout(resolve, 120));

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      const config = {
        fps: 12,
        qrbox: { width: 240, height: 240 },
        aspectRatio: 1,
      };

      try {
        await scanner.start({ facingMode: 'environment' }, config, handleScanSuccess, () => {});
      } catch {
        try {
          await scanner.start({ facingMode: 'user' }, config, handleScanSuccess, () => {});
        } catch {
          const cameras = await Html5Qrcode.getCameras();

          if (!cameras.length) {
            throw new Error('No camera found');
          }

          await scanner.start(cameras[0].id, config, handleScanSuccess, () => {});
        }
      }

      const video = document.querySelector('#qr-reader video') as HTMLVideoElement | null;
      if (video?.srcObject instanceof MediaStream) {
        const track = video.srcObject.getVideoTracks()[0];
        videoTrackRef.current = track;

        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        if (capabilities?.torch) {
          try {
            await track.applyConstraints({ advanced: [{ torch: true }] });
            setTorchOn(true);
          } catch {
            // Torch support is optional.
          }
        }
      }

      setStatus('scanning');
    } catch (error: unknown) {
      hasStartedRef.current = false;
      setStatus('error');

      const message =
        error instanceof Error && error.message.includes('Permission')
          ? 'Allow camera access to continue scanning.'
          : error instanceof Error && error.message.includes('No camera')
            ? 'No camera was found on this device.'
            : error instanceof Error && error.message.includes('NotReadable')
              ? 'This camera is already in use by another app.'
              : 'Unable to start the scanner right now.';

      setCameraError(message);
    }
  };

  useEffect(() => {
    let mounted = true;

    if (mounted) {
      void startCamera();
    }

    return () => {
      mounted = false;
      void stopScanner();
    };
  }, []);

  const handleScanSuccess = async (decodedText: string) => {
    if (isHandlingScanRef.current) {
      return;
    }

    isHandlingScanRef.current = true;
    setFeedback(null);
    setStatus('processing');
    playBeep();

    const ticketId = extractTicketId(decodedText);
    await stopScanner();

    try {
      const result = await onScan(ticketId);
      setFeedback(result);
      setStatus(result.success ? 'success' : 'error');
    } catch {
      setFeedback({
        success: false,
        title: 'Verification failed',
        message: 'Something went wrong while verifying this ticket.',
      });
      setStatus('error');
    } finally {
      isHandlingScanRef.current = false;
    }
  };

  const toggleTorch = async () => {
    const track = videoTrackRef.current;
    if (!track) return;

    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((prev) => !prev);
    } catch {
      setFeedback({
        success: false,
        title: 'Torch unavailable',
        message: 'This device does not support flashlight control in the scanner.',
      });
      setStatus('error');
    }
  };

  const handleRetry = async () => {
    await stopScanner();
    void startCamera();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/15 bg-neutral-950 text-white shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Live check-in</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Scan attendee ticket</h2>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/15"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/40">
            <div id="qr-reader" className="aspect-square w-full overflow-hidden" />

            {videoTrackRef.current && status === 'scanning' ? (
              <button
                onClick={toggleTorch}
                className={`absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                  torchOn
                    ? 'border-yellow-300/50 bg-yellow-400 text-black'
                    : 'border-white/15 bg-black/45 text-white'
                }`}
                aria-label="Toggle flashlight"
              >
                <Flashlight className="h-5 w-5" />
              </button>
            ) : null}

            {status === 'scanning' && !feedback ? (
              <div className="pointer-events-none absolute inset-x-6 top-6 rounded-full border border-emerald-300/15 bg-black/40 px-4 py-2 text-center text-sm font-medium text-emerald-100 backdrop-blur">
                Align the QR code inside the frame to verify entry.
              </div>
            ) : null}

            {(status === 'starting' || status === 'processing') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                <RefreshCw className="h-9 w-9 animate-spin text-white" />
                <p className="text-sm font-medium text-slate-200">
                  {status === 'starting' ? 'Starting camera...' : 'Verifying ticket...'}
                </p>
              </div>
            )}

            {feedback && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/65 p-5">
                <div
                  className={`w-full rounded-[1.5rem] border p-5 shadow-xl ${
                    feedback.success
                      ? 'border-emerald-300/20 bg-emerald-500/12'
                      : 'border-rose-300/20 bg-rose-500/12'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {feedback.success ? (
                      <CheckCircle className="mt-0.5 h-7 w-7 shrink-0 text-emerald-300" />
                    ) : (
                      <XCircle className="mt-0.5 h-7 w-7 shrink-0 text-rose-300" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-white">{feedback.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-200">{feedback.message}</p>
                      {feedback.details ? (
                        <p className="mt-2 text-sm text-slate-300">{feedback.details}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={handleRetry}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
                    >
                      <ScanLine className="h-4 w-4" />
                      Scan next ticket
                    </button>
                    <button
                      onClick={onClose}
                      className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {cameraError && (
            <div className="mt-4 rounded-[1.25rem] border border-rose-300/20 bg-rose-500/10 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-300" />
                <div>
                  <p className="font-medium text-white">Camera unavailable</p>
                  <p className="mt-1 text-sm text-slate-200">{cameraError}</p>
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-100"
              >
                <RefreshCw className="h-4 w-4" />
                Retry scanner
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        #qr-reader video {
          border-radius: 24px !important;
          object-fit: cover;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
