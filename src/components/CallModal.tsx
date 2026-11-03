/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  SwitchCamera,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { CallType, UserProfile } from '../types';
import { VerifiedBadge } from './VerifiedBadge';

export type { CallType };
import {
  initiateCall,
  listenToCallSession,
  endCallSession,
} from '../services/callService';

interface CallModalProps {
  chatId: string;
  callType: CallType;
  currentUser: UserProfile;
  otherUser: UserProfile;
  isInitiator?: boolean;
  initialCallId?: string;
  onEndCall: (durationSeconds: number, callType: CallType, wasConnected: boolean) => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  chatId,
  callType,
  currentUser,
  otherUser,
  isInitiator = true,
  initialCallId,
  onEndCall,
}) => {
  const [callId, setCallId] = useState<string>(initialCallId || `call_${chatId}`);
  const [callStatus, setCallStatus] = useState<'calling' | 'ringing' | 'connected' | 'declined'>(
    isInitiator ? 'calling' : 'connected'
  );
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const ringOscillatorRef = useRef<OscillatorNode | null>(null);
  const timerRef = useRef<any>(null);

  // Play outgoing ringing sound
  const startRingingSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      ringOscillatorRef.current = osc;
    } catch (e) {}
  };

  const stopRingingSound = () => {
    try {
      if (ringOscillatorRef.current) {
        ringOscillatorRef.current.stop();
        ringOscillatorRef.current.disconnect();
        ringOscillatorRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    } catch (e) {}
  };

  // Real-time Firestore signaling session listener
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupSession = async () => {
      let activeId = callId;
      if (isInitiator) {
        startRingingSound();
        try {
          activeId = await initiateCall(chatId, currentUser, otherUser, callType);
          setCallId(activeId);
        } catch (err) {
          console.warn('Notice initiating call session:', err);
        }
      }

      unsubscribe = listenToCallSession(activeId, (session) => {
        if (!session) {
          // Call doc was removed or ended
          if (callStatus === 'connected') {
            handleEnd(true);
          }
          return;
        }

        if (session.status === 'accepted') {
          stopRingingSound();
          setCallStatus('connected');
        } else if (session.status === 'declined') {
          stopRingingSound();
          setCallStatus('declined');
          setTimeout(() => {
            handleEnd(false);
          }, 1800);
        } else if (session.status === 'ended') {
          stopRingingSound();
          handleEnd(callStatus === 'connected');
        }
      });
    };

    setupSession();

    return () => {
      stopRingingSound();
      if (unsubscribe) unsubscribe();
    };
  }, [chatId, isInitiator]);

  // Duration counter once connected
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const interval = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [callStatus]);

  // Camera & Microphone stream
  useEffect(() => {
    let active = true;

    const setupMedia = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video' ? { facingMode } : false,
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasCameraPermission(true);

        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera/mic stream error or permission declined:', err);
      }
    };

    setupMedia();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [callType, facingMode]);

  const handleToggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach((t) => (t.enabled = !isVideoEnabled));
    }
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleToggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = isMuted));
    }
    setIsMuted(!isMuted);
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnd = async (wasConnected = callStatus === 'connected') => {
    stopRingingSound();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    await endCallSession(callId);
    onEndCall(duration, callType, wasConnected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl select-none animate-in fade-in duration-300">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg h-full max-h-[92vh] sm:h-[85vh] sm:rounded-3xl flex flex-col justify-between p-6 sm:p-8 bg-zinc-950/80 border border-zinc-800/60 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between z-20">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs backdrop-blur-md">
            {callType === 'video' ? <Video className="w-3.5 h-3.5 text-blue-400" /> : <Phone className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="font-medium capitalize">{callType} Call</span>
            <span className="opacity-40">•</span>
            <span className="text-zinc-300 font-mono text-[11px]">End-to-End Encrypted</span>
          </div>

          {callType === 'video' && hasCameraPermission && (
            <button
              onClick={handleFlipCamera}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Switch camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Center Main Stage (Video or Avatar) */}
        <div className="relative flex-1 flex flex-col items-center justify-center my-auto z-10 w-full">
          {callType === 'video' ? (
            <div className="relative w-full h-80 sm:h-96 rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner">
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-950">
                <img
                  src={
                    otherUser.profileImage ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.userId}`
                  }
                  alt={otherUser.fullName}
                  className="w-28 h-28 rounded-full object-cover border-4 border-zinc-800 shadow-xl mb-4"
                />
                <h3 className="text-lg font-semibold text-white">{otherUser.fullName}</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {callStatus === 'connected'
                    ? 'High Definition Live Video'
                    : callStatus === 'declined'
                    ? 'Call was declined'
                    : 'Waiting for answer...'}
                </p>
              </div>

              {/* PiP Local Video */}
              {isVideoEnabled && (
                <div className="absolute bottom-4 right-4 w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                {callStatus !== 'connected' && callStatus !== 'declined' && (
                  <motion.div
                    animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.15, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full bg-blue-500/30 blur-lg"
                  />
                )}
                <img
                  src={
                    otherUser.profileImage ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.userId}`
                  }
                  alt={otherUser.fullName}
                  className="relative w-32 h-32 rounded-full object-cover border-4 border-blue-500/40 shadow-2xl"
                />
                <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-500 border-3 border-zinc-950 flex items-center justify-center">
                  <Phone className="w-3 h-3 text-white" />
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {otherUser.fullName}
                </h2>
                {otherUser.isVerified && <VerifiedBadge size="sm" />}
              </div>

              <p className="text-xs text-blue-400 font-mono mb-3">@{otherUser.userId}</p>

              {/* Call Status / Live Duration */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-sm font-medium">
                {callStatus === 'calling' ? (
                  <span className="text-zinc-400 animate-pulse">Calling...</span>
                ) : callStatus === 'ringing' ? (
                  <span className="text-amber-400 animate-pulse">Ringing...</span>
                ) : callStatus === 'declined' ? (
                  <span className="text-rose-400 font-semibold">Call Declined</span>
                ) : (
                  <span className="text-emerald-400 font-mono tracking-wider font-semibold">
                    {formatDuration(duration)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="flex flex-col items-center gap-4 z-20">
          <div className="flex items-center justify-center gap-5 sm:gap-6 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/80 p-3.5 sm:p-4 rounded-3xl shadow-2xl">
            {/* Mute Button */}
            <button
              onClick={handleToggleMute}
              className={`p-4 rounded-2xl transition-all cursor-pointer ${
                isMuted
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-white'
              }`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Video Toggle */}
            {callType === 'video' && (
              <button
                onClick={handleToggleVideo}
                className={`p-4 rounded-2xl transition-all cursor-pointer ${
                  !isVideoEnabled
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                }`}
                title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
            )}

            {/* Speaker Toggle */}
            <button
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-4 rounded-2xl transition-all cursor-pointer ${
                isSpeakerOn
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  : 'bg-zinc-800/50 text-zinc-500'
              }`}
              title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
            >
              {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={() => handleEnd()}
              className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xl shadow-rose-600/30 transition-all cursor-pointer active:scale-95"
              title="End call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>

          <p className="text-[11px] text-zinc-500">
            LinkUp Real-Time Audio & Video Call Signaling
          </p>
        </div>
      </div>
    </div>
  );
};
