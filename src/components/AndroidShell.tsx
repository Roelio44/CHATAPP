/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { AndroidStatusBar } from './AndroidStatusBar';

interface AndroidShellProps {
  children: React.ReactNode;
}

export const AndroidShell: React.FC<AndroidShellProps> = ({ children }) => {
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(true);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-200 dark:bg-zinc-950 p-0 sm:p-4 md:p-6 transition-colors">
      {/* Device Frame Viewport Toggle for Desktop Testing */}
      <aside className="hidden md:flex items-center gap-2 mb-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-800 text-xs shadow-xs text-zinc-600 dark:text-zinc-400 z-50">
        <span className="font-medium mr-1">Preview:</span>
        <button
          onClick={() => setDeviceFrameMode(true)}
          className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
            deviceFrameMode
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Android Phone</span>
        </button>
        <button
          onClick={() => setDeviceFrameMode(false)}
          className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all cursor-pointer ${
            !deviceFrameMode
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Full Width</span>
        </button>
      </aside>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-300 flex flex-col overflow-hidden relative ${
          deviceFrameMode
            ? 'max-w-[420px] h-[100dvh] sm:h-[840px] sm:max-h-[92vh] sm:rounded-[44px] sm:border-[8px] sm:border-zinc-800 dark:sm:border-zinc-800/90 sm:shadow-2xl sm:shadow-black/30 bg-zinc-50 dark:bg-zinc-950'
            : 'max-w-xl h-[100dvh] sm:h-[840px] sm:rounded-3xl border border-zinc-300 dark:border-zinc-800 shadow-xl bg-zinc-50 dark:bg-zinc-950'
        }`}
      >
        {/* Android Punch Hole Camera on device frame */}
        {deviceFrameMode && (
          <div className="hidden sm:block absolute top-3.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-black border border-zinc-700 z-40" />
        )}

        {/* Authentic Android System Status Bar */}
        <AndroidStatusBar />

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {children}
        </main>

        {/* Android Bottom Gesture Pill Bar */}
        <div className="w-full py-1.5 bg-white dark:bg-zinc-900 flex justify-center items-center shrink-0">
          <div className="w-28 h-1 rounded-full bg-zinc-400/50 dark:bg-zinc-600/60" />
        </div>
      </div>
    </div>
  );
};
