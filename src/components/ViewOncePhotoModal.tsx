/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, X, EyeOff, Lock } from 'lucide-react';

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
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  useEffect(() => {
    // 1. Block right click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Block screenshot & print keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        setSecurityNotice('Screenshots are strictly prohibited on view-once media.');
        setTimeout(() => onClose(), 800);
        return;
      }

      // Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5 on Mac
      if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setSecurityNotice('Capture attempt detected. View-once photo is closed.');
        setTimeout(() => onClose(), 800);
        return;
      }

      // Ctrl+P / Cmd+P (Print) or Ctrl+S / Cmd+S (Save)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's' || e.key === 'P' || e.key === 'S')) {
        e.preventDefault();
        setSecurityNotice('Saving or printing is disabled for this photo.');
        return;
      }

      // Escape to close normally
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 3. Detect window blur or visibility change (common when taking screenshots or switching apps)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setSecurityNotice('App switch or screen capture detected. Closing photo.');
        onClose();
      }
    };

    const handleWindowBlur = () => {
      setSecurityNotice('Window unfocused or screen snip detected. Closing photo.');
      setTimeout(() => onClose(), 500);
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-4 select-none"
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between pb-3 z-20 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-white">View-Once Photo</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                1 Time
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              From {senderName} • Disappears permanently once closed
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shadow-md border border-zinc-700"
        >
          <X className="w-4 h-4" />
          <span>Done</span>
        </button>
      </div>

      {/* Security alert if shortcut was attempted */}
      {securityNotice && (
        <div className="w-full max-w-md mx-auto my-2 p-3 bg-red-950/80 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2 animate-pulse">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
          <span>{securityNotice}</span>
        </div>
      )}

      {/* Main Image Viewport with Watermark and Anti-Screen Grab Protection */}
      <div className="relative flex-1 w-full max-w-4xl mx-auto flex items-center justify-center overflow-hidden my-auto py-2">
        <div className="relative max-w-full max-h-[75vh] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-950">
          <img
            src={imageUrl}
            alt="View Once Content"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            className="max-w-full max-h-[75vh] object-contain pointer-events-none"
            style={{
              WebkitTouchCallout: 'none',
              pointerEvents: 'none',
            }}
          />

          {/* Diagonal Security Watermark Pattern to prevent external re-photographing */}
          <div
            className="absolute inset-0 pointer-events-none flex flex-col justify-around opacity-25 overflow-hidden select-none"
            aria-hidden="true"
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="text-[11px] font-mono tracking-widest text-white whitespace-nowrap -rotate-12 transform"
              >
                CONFIDENTIAL • VIEW ONCE • @{viewerUserId} • LINKUP PROTECTED •
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Security Assurance Footer */}
      <div className="w-full max-w-md mx-auto text-center pb-2 z-20">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-400">
          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
          <span>Screenshots & recordings blocked • Will be deleted upon exit</span>
        </div>
      </div>
    </div>
  );
};
