/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isMe: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  duration = 0,
  isMe,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setActualDuration(Math.round(audio.duration));
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('Audio play error:', err);
      });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !actualDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * actualDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatSeconds = (sec: number) => {
    const s = Math.floor(sec || 0);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
  };

  // Generate 20 static wave bar heights
  const waveBars = [
    30, 45, 75, 90, 60, 40, 85, 100, 65, 45, 90, 75, 40, 60, 85, 100, 70, 50, 40, 25,
  ];

  const progressPercent = actualDuration > 0 ? (currentTime / actualDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-1 min-w-[200px] max-w-[280px]">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs ${
          isMe
            ? 'bg-white text-blue-600 hover:bg-blue-50'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={isPlaying ? 'Pause' : 'Play voice message'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Scrubber & Timer */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          onClick={handleSeek}
          className="h-6 flex items-center gap-0.5 cursor-pointer relative py-1"
          title="Click to seek"
        >
          {waveBars.map((heightPercent, index) => {
            const barProgress = (index / (waveBars.length - 1)) * 100;
            const isFilled = barProgress <= progressPercent;

            return (
              <span
                key={index}
                style={{ height: `${heightPercent}%` }}
                className={`flex-1 rounded-full min-w-[2px] transition-colors duration-150 ${
                  isFilled
                    ? isMe
                      ? 'bg-white'
                      : 'bg-blue-600 dark:bg-blue-400'
                    : isMe
                    ? 'bg-white/40'
                    : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
              />
            );
          })}
        </div>

        {/* Duration / current position */}
        <div
          className={`flex items-center justify-between text-[10px] font-mono select-none ${
            isMe ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <span>{isPlaying ? formatSeconds(currentTime) : 'Voice note'}</span>
          <span>{formatSeconds(actualDuration)}</span>
        </div>
      </div>
    </div>
  );
};
