/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Signal, BatteryCharging } from 'lucide-react';

export const AndroidStatusBar: React.FC = () => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex items-center justify-between px-6 pt-3 pb-2 text-xs font-medium tracking-tight select-none text-zinc-700 dark:text-zinc-300 z-30 transition-colors">
      <span className="font-semibold tracking-wide">{time || '09:41'}</span>
      <div className="flex items-center gap-2">
        <Signal className="w-3.5 h-3.5" />
        <Wifi className="w-3.5 h-3.5" />
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono">98%</span>
          <div className="w-4 h-2.5 border border-current rounded-[2px] p-[1px] flex items-center">
            <div className="h-full w-4/5 bg-current rounded-[1px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
