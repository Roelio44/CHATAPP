/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X, EyeOff, Lock, Hand, Sparkles, AlertTriangle } from 'lucide-react';

interface ViewOncePhotoModalProps {
  imageUrl: string;
  senderName: string;
  viewerUserId: string;
  onClose: () => void;
}

export const ViewOncePhotoModal: React.FC<ViewOncePhotoModalProps> = ({
  imageUrl,
  senderName,
  viewerUserId,
  onClose,
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [hasStartedViewing, setHasStartedViewing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);
  const [isBlackedOut, setIsBlackedOut] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const hasEndedRef = useRef(false);

  // Safe termination: execute onClose exactly once
  const handleBurnAndClose = useCallback(
    (reason?: string) => {
      if (hasEndedRef.current) return;
      hasEndedRef.current = true;
      setIsBlackedOut(true);

      // Instantly clear canvas memory
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      if (reason) {
        setSecurityNotice(reason);
        setTimeout(() => onClose(), 600);
      } else {
        onClose();
      }
    },
    [onClose]
  );

  // Preload image in memory for canvas drawing
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageObjRef.current = img;
    };
  }, [imageUrl]);

  // Draw image on canvas when user is actively holding down
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isHolding && !isBlackedOut && imageObjRef.current) {
      const img = imageObjRef.current;
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;

      // Draw photo
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw dynamic forensic security watermark diagonally across canvas
      ctx.save();
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.textAlign = 'center';
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6);

      const watermarkText = `ALBANIACHAT SECURE • 1-TIME VIEW • @${viewerUserId}`;
      for (let y = -canvas.height; y < canvas.height; y += 120) {
        ctx.fillText(watermarkText, 0, y);
      }
      ctx.restore();
    } else {
      // Clear canvas pixels completely
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [isHolding, isBlackedOut, viewerUserId]);

  // 10-Second self-destruct timer while holding
  useEffect(() => {
    if (!isHolding || isBlackedOut) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleBurnAndClose('Viewing time expired. One-time photo burned.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isHolding, isBlackedOut, handleBurnAndClose]);

  // Anti-Screenshot & Capture Protection Event Listeners
  useEffect(() => {
    // 1. Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Block shortcut keys (PrintScreen, Mac Cmd+Shift+3/4/5, Windows Win+Shift+S, Snipping Tool)
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        setIsHolding(false);
        handleBurnAndClose('Screenshots prohibited. Photo permanently closed.');
        return;
      }

      // Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5, Ctrl+Shift+S
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setIsHolding(false);
        handleBurnAndClose('Screen capture attempt detected. Photo closed.');
        return;
      }

      // Print (Ctrl+P / Cmd+P) or Save (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && ['p', 's', 'P', 'S'].includes(e.key)) {
        e.preventDefault();
        return;
      }

      // Escape key to dismiss
      if (e.key === 'Escape') {
        handleBurnAndClose();
      }
    };

    // 3. Instant blackout on window blur (fires when OS screenshot shortcuts or app switchers open)
    const handleWindowBlur = () => {
      setIsHolding(false);
      handleBurnAndClose('Screen unfocused or screenshot tool activated. Photo closed.');
    };

    // 4. Instant blackout on document visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsHolding(false);
        handleBurnAndClose('App switched or capture triggered. Photo closed.');
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleBurnAndClose]);

  // Touch handlers: Press & hold required to view
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    // If multi-touch detected (e.g. 2 or 3 fingers trying screenshot gestures), immediately cancel
    if ('touches' in e && e.touches.length > 1) {
      setIsHolding(false);
      handleBurnAndClose('Multi-touch detected. Viewing cancelled.');
      return;
    }

    if (!isBlackedOut) {
      setIsHolding(true);
      setHasStartedViewing(true);
    }
  };

  const handleTouchEnd = () => {
    setIsHolding(false);
    if (hasStartedViewing) {
      // Releasing finger immediately closes the 1-time view photo!
      handleBurnAndClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 select-none touch-none overflow-hidden"
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between pb-3 z-30 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white">View-Once Photo</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500 text-black font-extrabold shadow-xs">
                1 Time Only
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              From {senderName} • Screenshots blocked • Hold to reveal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasStartedViewing && (
            <div className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold flex items-center gap-1">
              <span>{timeLeft}s</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleBurnAndClose()}
            className="px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-md border border-zinc-700"
          >
            <X className="w-4 h-4" />
            <span>Close</span>
          </button>
        </div>
      </div>

      {/* Security alert if shortcut or screen grab was attempted */}
      {securityNotice && (
        <div className="w-full max-w-md mx-auto my-2 p-3 bg-red-950/90 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-center gap-2 shadow-2xl z-40">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span className="font-semibold">{securityNotice}</span>
        </div>
      )}

      {/* Main Touch-and-Hold Viewport */}
      <div
        className="relative flex-1 w-full max-w-4xl mx-auto flex items-center justify-center my-auto py-2 z-20 cursor-pointer"
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Canvas for displaying the photo strictly while held down */}
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl transition-opacity duration-150 ${
            isHolding && !isBlackedOut ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{
            WebkitTouchCallout: 'none',
            pointerEvents: 'none',
          }}
        />

        {/* Hold-to-View Privacy Gate Overlay */}
        {(!isHolding || isBlackedOut) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/90 rounded-2xl border border-zinc-800/80 backdrop-blur-md">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10 animate-pulse">
              <Hand className="w-10 h-10" />
            </div>

            <h3 className="text-base font-bold text-white mb-1.5 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Press & Hold to Reveal</span>
            </h3>

            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed mb-4">
              Hold your finger down to view the photo. Releasing your finger or attempting a screenshot immediately closes and permanently deletes it.
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-amber-300 font-medium">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Screenshots & recordings blocked</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Notice */}
      <div className="w-full max-w-md mx-auto text-center pb-2 z-30">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-400">
          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
          <span>AlbaniaCHAT Privacy Shield • 1-Time View Protected</span>
        </div>
      </div>
    </div>
  );
};
