/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, ShieldCheck } from 'lucide-react';
import { CallSession } from '../types';
import { playIncomingCallSound } from '../utils/notificationService';

interface IncomingCallModalProps {
  session: CallSession;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  session,
  onAccept,
  onDecline,
}) => {
  // Play ringtone while incoming call modal is mounted
  useEffect(() => {
    const stopSound = playIncomingCallSound();
    return () => stopSound();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-950/95 border border-zinc-800 p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-20 -left-20 w-48 h-48 rounded-full bg-blue-600/25 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-emerald-600/25 blur-3xl pointer-events-none" />

        {/* Call Type Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-medium mb-6">
          {session.type === 'video' ? (
            <Video className="w-3.5 h-3.5 text-blue-400" />
          ) : (
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span>Incoming {session.type === 'video' ? 'Video' : 'Voice'} Call</span>
        </div>

        {/* Pulsing Avatar with Waves */}
        <div className="relative mb-5">
          <motion.div
            animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0.1, 0.6] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="absolute inset-0 rounded-full bg-blue-500/40 blur-md"
          />
          <img
            src={
              session.callerImage ||
              `https://api.dicebear.com/7.x/bottts/svg?seed=${session.callerUserId || session.callerId}`
            }
            alt={session.callerName}
            className="relative w-24 h-24 rounded-full object-cover border-4 border-blue-500/40 shadow-xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${session.callerId}`;
            }}
          />
        </div>

        {/* Caller Info */}
        <h3 className="text-xl font-bold text-white tracking-tight">{session.callerName}</h3>
        {session.callerUserId && (
          <p className="text-xs text-blue-400 font-mono mt-0.5">@{session.callerUserId}</p>
        )}
        <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Ringing on LinkUp Messenger...</span>
        </p>

        {/* Action Buttons: Decline and Accept */}
        <div className="mt-8 flex items-center justify-center gap-8 w-full">
          {/* Decline */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onDecline}
              className="w-15 h-15 rounded-full bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-lg shadow-rose-600/30 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              title="Decline call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-[11px] font-medium text-zinc-400">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onAccept}
              className="w-15 h-15 rounded-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-transform active:scale-90 cursor-pointer animate-bounce"
              title="Accept call"
            >
              {session.type === 'video' ? (
                <Video className="w-6 h-6" />
              ) : (
                <Phone className="w-6 h-6" />
              )}
            </button>
            <span className="text-[11px] font-medium text-emerald-400 font-semibold">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
