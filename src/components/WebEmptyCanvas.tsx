/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MessageSquareShare, UserPlus, Users, ShieldCheck, Sparkles } from 'lucide-react';
import { MainTab } from '../types';

interface WebEmptyCanvasProps {
  onNavigateTab: (tab: MainTab) => void;
}

export const WebEmptyCanvas: React.FC<WebEmptyCanvasProps> = ({ onNavigateTab }) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-zinc-50/50 dark:bg-zinc-950/60 select-none text-center">
      <div className="max-w-md flex flex-col items-center">
        {/* Animated App Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 text-white shadow-2xl shadow-blue-500/20 flex items-center justify-center">
            <MessageSquareShare className="w-12 h-12" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-emerald-500 text-white border-4 border-zinc-50 dark:border-zinc-950">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          LinkUp Messenger Web
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Select a chat from the sidebar to continue your conversation, or search for users by their unique User ID to connect in real time.
        </p>

        {/* Quick action buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            onClick={() => onNavigateTab('search')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Discover Users</span>
          </button>

          <button
            onClick={() => onNavigateTab('friends')}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200 text-xs font-semibold active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Users className="w-4 h-4 text-blue-500" />
            <span>View Friends</span>
          </button>
        </div>

        {/* Security badge footer */}
        <div className="mt-12 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-200/50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 text-[11px] text-zinc-500 dark:text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
          <span>Real-time dynamic database synchronization</span>
        </div>
      </div>
    </div>
  );
};
