'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Keyboard, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';

interface CameraScanProps {
  onScan: (ticketId: string) => void;
  onClose: () => void;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export default function CameraScan({ onScan, onClose }: CameraScanProps) {
  const [mode, setMode] = useState<'choose' | 'camera' | 'manual'>('choose');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // scanning
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.log('Scanner cleanup:', e);
      }
      scannerRef.current = null;
    }
  };

  const startCamera = async () => {
    setError(null);
    setIsStarting(true);
    setMode('camera');
    setScanStatus('scanning');

    // Small delay to ensure DOM is ready
    await new Promise(r => setTimeout(r, 100));

    try {
      // Create scanner instance
      scannerRef.current = new Html5Qrcode('qr-reader');

      // Camera config
      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      try {
        // Try back camera first (better for scanning)
        await scannerRef.current.start(
          { facingMode: 'environment' },
          config,
          handleScanSuccess,
          () => {} // Ignore scan failures
        );
      } catch {
        // If back camera fails, try any available camera
        console.log('Back camera failed, trying any camera...');
        await scannerRef.current.start(
          { facingMode: 'user' },
          config,
          handleScanSuccess,
          () => {}
        );
      }

      setIsStarting(false);
    } catch (err: any) {
      setIsStarting(false);
      console.error('Camera error:', err);
      
      // Provide helpful error messages
      let errorMsg = 'Could not access camera. ';
      
      if (err.message?.includes('Permission')) {
        errorMsg += 'Please allow camera access in your browser settings.';
      } else if (err.message?.includes('NotFound') || err.message?.includes('no camera')) {
        errorMsg += 'No camera found on this device.';
      } else if (err.message?.includes('NotReadable') || err.message?.includes('in use')) {
        errorMsg += 'Camera is being used by another app.';
      } else {
        errorMsg += err.message || 'Please try manual entry instead.';
      }
      
      setError(errorMsg);
      setScanStatus('error');
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    // Stop scanner first
    stopScanner();
    setScanStatus('success');
    
    // Extract ticket ID from URL or use directly
    let ticketId = decodedText;
    
    // If it's a URL, extract the ticket ID
    if (decodedText.includes('/')) {
      const parts = decodedText.split('/');
      ticketId = parts[parts.length - 1];
    }
    
    // Remove any query params
    if (ticketId.includes('?')) {
      ticketId = ticketId.split('?')[0];
    }
    
    // Small delay for visual feedback
    setTimeout(() => {
      onScan(ticketId.trim());
    }, 300);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (trimmed) {
      onScan(trimmed);
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setScanStatus('scanning');
    startCamera();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-900/95 backdrop-blur-xl"
        onClick={handleClose}
      />

      {/* Scanner Container */}
      <div className="relative w-full max-w-md">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Main Card */}
        <div className="bg-neutral-900 border border-white/20 rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white text-center">
              {mode === 'camera' ? 'Scan QR Code' : mode === 'manual' ? 'Enter Ticket ID' : 'Verify Ticket'}
            </h2>
          </div>

          <div className="p-6">
            {/* Choose Mode */}
            {mode === 'choose' && (
              <div className="space-y-4">
                <p className="text-center text-neutral-400 mb-6">
                  How would you like to verify the ticket?
                </p>
                
                <button
                  onClick={startCamera}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-white hover:bg-neutral-100 text-neutral-900 rounded-2xl transition-all hover:scale-[1.02]"
                >
                  <Camera className="w-6 h-6" />
                  <span className="font-medium">Scan QR Code</span>
                </button>
                
                <button
                  onClick={() => setMode('manual')}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-neutral-700 hover:bg-neutral-600 text-white border border-white/10 rounded-2xl transition-all"
                >
                  <Keyboard className="w-6 h-6" />
                  <span className="font-medium">Enter Ticket ID</span>
                </button>
              </div>
            )}

            {/* Camera Mode */}
            {mode === 'camera' && (
              <div className="space-y-4">
                {/* Scanner Container with Frame */}
                <div className="relative">
                  {/* QR Scanner Container */}
                  <div 
                    id="qr-reader" 
                    ref={containerRef}
                    className="w-full aspect-square bg-black/50 rounded-2xl overflow-hidden"
                  />

                  {/* Scanning Frame Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Corner brackets - white for neutral theme */}
                    <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-white/60 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-white/60 rounded-tr-lg" />
                    <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-white/60 rounded-bl-lg" />
                    <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-white/60 rounded-br-lg" />

                    {/* Animated scan line */}
                    {scanStatus === 'scanning' && !error && !isStarting && (
                      <div className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-pulse" style={{ top: '50%' }} />
                    )}

                    {/* Success overlay */}
                    {scanStatus === 'success' && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center rounded-2xl">
                        <div className="p-4 bg-green-500 rounded-full animate-pulse">
                          <CheckCircle className="w-12 h-12 text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Loading State */}
                  {isStarting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                      <div className="text-center">
                        <RefreshCw className="w-10 h-10 animate-spin text-white mx-auto mb-3" />
                        <p className="text-white/80">Starting camera...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instruction text */}
                {!error && !isStarting && scanStatus === 'scanning' && (
                  <p className="text-center text-neutral-400 text-sm">
                    Position the QR code within the frame
                  </p>
                )}

                {/* Error State */}
                {error && (
                  <div className="bg-neutral-800 border border-red-400/30 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-red-400 text-sm">{error}</p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleRetry}
                            className="text-sm px-4 py-2 bg-white text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
                          >
                            Try Again
                          </button>
                          <button
                            onClick={() => { stopScanner(); setMode('manual'); setError(null); }}
                            className="text-sm px-4 py-2 bg-neutral-700 text-white rounded-xl hover:bg-neutral-600 transition-colors"
                          >
                            Enter Manually
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Back Button */}
                {!error && (
                  <button
                    onClick={() => { stopScanner(); setMode('choose'); setScanStatus('idle'); }}
                    className="w-full p-3 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all text-sm"
                  >
                    ← Back to options
                  </button>
                )}
              </div>
            )}

            {/* Manual Entry Mode */}
            {mode === 'manual' && (
              <div className="space-y-4">
                <p className="text-center text-neutral-400">
                  Enter the ticket ID from the ticket
                </p>
                
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                    placeholder="TKT-XXXXXXXX"
                    className="w-full p-4 bg-neutral-800 border border-white/20 rounded-2xl text-center text-lg font-mono text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                    autoFocus
                  />
                  
                  <button
                    type="submit"
                    disabled={!manualInput.trim()}
                    className="w-full p-4 bg-white hover:bg-neutral-100 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-900 rounded-2xl font-medium transition-all"
                  >
                    Verify Ticket
                  </button>
                </form>

                <button
                  onClick={() => setMode('choose')}
                  className="w-full p-3 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all text-sm"
                >
                  ← Back to options
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom CSS for scanner styles */}
      <style jsx global>{`
        #qr-reader video {
          border-radius: 16px !important;
        }
        #qr-reader__scan_region {
          background: transparent !important;
        }
        #qr-reader__scan_region img {
          display: none !important;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
