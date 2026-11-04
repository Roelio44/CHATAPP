/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Trash2, Send, Loader2 } from 'lucide-react';

interface VoiceRecorderBarProps {
  onSendVoice: (audioDataUrl: string, durationSeconds: number) => void;
  onCancel: () => void;
}

export const VoiceRecorderBar: React.FC<VoiceRecorderBarProps> = ({
  onSendVoice,
  onCancel,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    let isCancelled = false;

    const startRecording = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setErrorMsg('Microphone not supported in this browser.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        audioChunksRef.current = [];

        // Select compatible mime type
        let mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start(150); // Slice every 150ms

        // Start timer
        timerRef.current = setInterval(() => {
          setSeconds((prev) => prev + 1);
        }, 1000);
      } catch (err: any) {
        console.error('Microphone access denied:', err);
        setErrorMsg('Microphone permission denied. Please allow microphone access.');
      }
    };

    startRecording();

    return () => {
      isCancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onCancel();
  };

  const handleFinishAndSend = () => {
    if (!mediaRecorderRef.current || isProcessing) return;
    setIsProcessing(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const recorder = mediaRecorderRef.current;
    const recordedDuration = Math.max(1, seconds);

    recorder.onstop = async () => {
      try {
        const mimeType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        // Convert blob to base64 Data URL
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
          }
          onSendVoice(dataUrl, recordedDuration);
        };
        reader.readAsDataURL(audioBlob);
      } catch (err) {
        console.error('Failed to encode voice note:', err);
        onCancel();
      }
    };

    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (errorMsg) {
    return (
      <div className="flex-1 flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl">
        <span className="text-xs text-red-600 dark:text-red-300 truncate">{errorMsg}</span>
        <button
          type="button"
          onClick={handleCancel}
          className="text-xs text-red-600 dark:text-red-400 font-semibold underline ml-2 cursor-pointer shrink-0"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-between px-3 py-1.5 bg-red-500/10 dark:bg-red-500/15 border border-red-500/30 rounded-2xl">
      {/* Left: Pulsing Recording Dot and Timer */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex items-center justify-center">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping absolute" />
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 relative" />
        </div>
        <span className="text-xs font-mono font-semibold text-red-600 dark:text-red-400">
          {formatTimer(seconds)}
        </span>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:inline">
          Recording voice note...
        </span>
      </div>

      {/* Center: Audio Waveform Activity simulation */}
      <div className="flex items-center gap-0.5 h-4 px-2">
        {[40, 70, 100, 60, 90, 45, 80, 100, 60, 40].map((h, i) => (
          <span
            key={i}
            style={{
              height: `${Math.max(25, (h * ((seconds % 2) + 1)) / 2)}%`,
            }}
            className="w-0.5 rounded-full bg-red-500/70 transition-all duration-300"
          />
        ))}
      </div>

      {/* Right: Cancel and Send Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isProcessing}
          className="p-1.5 rounded-full text-zinc-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors cursor-pointer"
          title="Cancel recording"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleFinishAndSend}
          disabled={isProcessing}
          className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
          title="Send voice message"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Send className="w-3 h-3" />
              <span>Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
