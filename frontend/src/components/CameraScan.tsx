'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Keyboard, AlertCircle, RefreshCw } from 'lucide-react';

interface CameraScanProps {
  onScan: (ticketId: string) => void;
  onClose: () => void;
}

export default function CameraScan({ onScan, onClose }: CameraScanProps) {
  const [mode, setMode] = useState<'choose' | 'camera' | 'manual'>('choose');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
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

    // Small delay to ensure DOM is ready
    await new Promise(r => setTimeout(r, 100));

    try {
      // Create scanner instance
      scannerRef.current = new Html5Qrcode('qr-reader');

      // Try to start with back camera first, then any camera
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
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
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    // Stop scanner first
    stopScanner();
    
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
    
    onScan(ticketId.trim());
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
    startCamera();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold">Scan Ticket</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {/* Choose Mode */}
          {mode === 'choose' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
                How would you like to verify the ticket?
              </p>
              
              <button
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
              >
                <Camera className="w-6 h-6" />
                <span className="font-medium">Scan QR Code</span>
              </button>
              
              <button
                onClick={() => setMode('manual')}
                className="w-full flex items-center justify-center gap-3 p-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <Keyboard className="w-6 h-6" />
                <span className="font-medium">Enter Ticket ID</span>
              </button>
            </div>
          )}

          {/* Camera Mode */}
          {mode === 'camera' && (
            <div className="space-y-4">
              {/* Scanner Container */}
              <div 
                id="qr-reader" 
                ref={containerRef}
                className="w-full aspect-square bg-black rounded-xl overflow-hidden"
              />

              {/* Loading State */}
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Starting camera...</p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={handleRetry}
                          className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={() => { stopScanner(); setMode('manual'); setError(null); }}
                          className="text-sm px-3 py-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
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
                  onClick={() => { stopScanner(); setMode('choose'); }}
                  className="w-full p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  ← Back to options
                </button>
              )}
            </div>
          )}

          {/* Manual Entry Mode */}
          {mode === 'manual' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600 dark:text-gray-400">
                Enter the ticket ID from the ticket
              </p>
              
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter ticket ID..."
                  className="w-full p-4 border dark:border-gray-700 rounded-xl text-center text-lg font-mono bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="w-full p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-medium transition-colors"
                >
                  Verify Ticket
                </button>
              </form>

              <button
                onClick={() => setMode('choose')}
                className="w-full p-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              >
                ← Back to options
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
