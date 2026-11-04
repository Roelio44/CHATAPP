/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, LogOut, Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserProfile } from '../types';

interface BannedScreenProps {
  userProfile: UserProfile;
}

export const BannedScreen: React.FC<BannedScreenProps> = ({ userProfile }) => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-zinc-950 p-4 select-none">
      <div className="w-full max-w-md bg-zinc-900 border border-rose-900/40 rounded-3xl p-7 shadow-2xl text-center flex flex-col items-center">
        {/* Glowing Shield Alert Icon */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-950">
            <ShieldAlert className="w-10 h-10 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md">
            <Lock className="w-3.5 h-3.5" />
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold tracking-wider uppercase mb-3">
          Account Suspended
        </span>

        <h2 className="text-xl font-bold text-zinc-100">
          Access Restricted
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          Your account <span className="font-semibold text-zinc-200">@{userProfile.userId}</span> has been suspended by the platform administrator.
        </p>

        {/* Reason Box */}
        <div className="mt-5 w-full bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-4 text-left">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
            Reason for suspension:
          </span>
          <p className="text-xs text-rose-300 font-medium leading-relaxed">
            {userProfile.banReason || 'Violation of AlbaniaCHAT Terms of Service or community safety guidelines.'}
          </p>
        </div>

        {/* Contact Admin */}
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
          <Mail className="w-4 h-4 text-zinc-500" />
          <span>Appeal / Support: <a href="mailto:roeliobinance@gmail.com" className="text-blue-400 hover:underline">roeliobinance@gmail.com</a></span>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="mt-6 w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};
