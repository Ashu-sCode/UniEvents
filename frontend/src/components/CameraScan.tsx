"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  X,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Flashlight,
} from "lucide-react";

interface CameraScanProps {
  onScan: (ticketId: string) => void;
  onClose: () => void;
}

type ScanStatus = "starting" | "scanning" | "success" | "error";

export default function CameraScan({ onScan, onClose }: CameraScanProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>("starting");
  const [torchOn, setTorchOn] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasStartedRef = useRef(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  // 🔊 Beep sound
  const playBeep = () => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
      oscillator.connect(ctx.destination);
      oscillator.start();
      setTimeout(() => oscillator.stop(), 120);
    } catch {}
  };

  // ✅ FIXED useEffect (NO async return)
  useEffect(() => {
    let isMounted = true;

    (async () => {
      if (!isMounted) return;
      await startCamera();
    })();

    return () => {
      isMounted = false;
      // ⚠️ DO NOT return promise
      stopScanner().catch(() => {});
    };
  }, []);

const startCamera = async () => {
  console.log("🎥 startCamera called");

  if (hasStartedRef.current) {
    console.log("⚠️ Scanner already started, skipping");
    return;
  }

  hasStartedRef.current = true;

  setError(null);
  setStatus("starting");

  await new Promise((r) => setTimeout(r, 100));

  try {
    console.log("📷 Creating Html5Qrcode instance...");
    scannerRef.current = new Html5Qrcode("qr-reader");

    const config = {
      fps: 12,
      qrbox: { width: 240, height: 240 },
      aspectRatio: 1.0,
    };

    console.log("⚙️ Config:", config);

    // 🔥 CAMERA START WITH FALLBACKS
    try {
      console.log("📷 Trying BACK camera (environment)...");
      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        handleScanSuccess,
        () => {}
      );
    } catch (err) {
      console.warn("⚠️ Back camera failed:", err);

      try {
        console.log("🤳 Trying FRONT camera (user)...");
        await scannerRef.current.start(
          { facingMode: "user" },
          config,
          handleScanSuccess,
          () => {}
        );
      } catch (err2) {
        console.warn("⚠️ Front camera failed:", err2);

        console.log("🔍 Getting available cameras...");
        const devices = await Html5Qrcode.getCameras();

        console.log("📱 Available cameras:", devices);

        if (devices && devices.length > 0) {
          console.log("🎯 Using first available camera:", devices[0]);

          await scannerRef.current.start(
            devices[0].id,
            config,
            handleScanSuccess,
            () => {}
          );
        } else {
          throw new Error("❌ No cameras found on device");
        }
      }
    }

    console.log("✅ Camera started successfully");

    // 🎥 Get video track safely
    const video = document.querySelector(
      "#qr-reader video"
    ) as HTMLVideoElement | null;

    console.log("📺 Video element:", video);

    if (video && video.srcObject instanceof MediaStream) {
      const stream = video.srcObject;
      const track = stream.getVideoTracks()[0];
      videoTrackRef.current = track;

      console.log("🎬 Video track:", track);

      const capabilities: any = track.getCapabilities?.();
      console.log("🔍 Capabilities:", capabilities);

      // 🔦 Torch auto-enable (safe)
      if (capabilities?.torch) {
        console.log("🔦 Torch supported, enabling...");

        try {
          await (track as any).applyConstraints({
            advanced: [{ torch: true }],
          });

          setTorchOn(true);
          console.log("✅ Torch enabled");
        } catch (e) {
          console.warn("⚠️ Torch enable failed:", e);
        }
      } else {
        console.log("⚠️ Torch not supported");
      }
    } else {
      console.warn("⚠️ Video or stream not ready");
    }

    setStatus("scanning");
  } catch (err: any) {
    console.error("❌ CAMERA START ERROR FULL:", err);

    hasStartedRef.current = false; // 🔥 IMPORTANT

    setStatus("error");

    let msg = "Could not access camera. ";

    if (err?.message) console.log("Error message:", err.message);

    if (err.message?.includes("Permission")) {
      msg += "Allow camera permission.";
    } else if (err.message?.includes("NotFound")) {
      msg += "No camera found.";
    } else if (err.message?.includes("NotReadable")) {
      msg += "Camera is in use.";
    } else {
      msg += "Unknown error.";
    }

    setError(msg);
  }
};

  const toggleTorch = async () => {
    const track = videoTrackRef.current;
    if (!track) return;

    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch {
      alert("Torch not supported");
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
    setStatus("success");

    playBeep();

    let ticketId = decodedText;

    if (decodedText.includes("/")) {
      ticketId = decodedText.split("/").pop() || decodedText;
    }

    if (ticketId.includes("?")) {
      ticketId = ticketId.split("?")[0];
    }

    setTimeout(() => {
      onScan(ticketId.trim());
    }, 500);
  };

  const handleRetry = () => {
    stopScanner().then(() => startCamera());
  };

  const handleClose = () => {
    stopScanner().then(() => onClose());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/90 backdrop-blur-lg"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-md">
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 text-white"
        >
          <X />
        </button>

        <div className="bg-neutral-900 border border-white/20 rounded-2xl p-4">
          <h2 className="text-white text-center text-lg mb-4">Scan QR Code</h2>

          <div className="relative">
            <div
              id="qr-reader"
              className="w-full aspect-square rounded-2xl overflow-hidden"
            />

            {/* Torch */}
            {videoTrackRef.current && (
              <button
                onClick={toggleTorch}
                className={`absolute top-3 right-3 p-2 rounded-full ${
                  torchOn
                    ? "bg-yellow-400 text-black"
                    : "bg-black/60 text-white"
                }`}
              >
                <Flashlight className="w-5 h-5" />
              </button>
            )}

            {/* Success */}
            {status === "success" && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 rounded-2xl animate-pulse">
                <CheckCircle className="text-white w-16 h-16" />
              </div>
            )}

            {/* Loading */}
            {status === "starting" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
                <RefreshCw className="animate-spin text-white w-8 h-8" />
              </div>
            )}
          </div>

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
          object-fit: cover;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
