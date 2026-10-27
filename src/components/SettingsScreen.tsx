/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Moon,
  Sun,
  Smartphone,
  Shield,
  Eye,
  CheckCheck,
  Bell,
  LogOut,
  Info,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ThemePreference, UserProfile } from '../types';

interface SettingsScreenProps {
  currentProfile: UserProfile;
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentProfile,
  onBack,
}) => {
  const { theme, setTheme, isDark } = useTheme();
  const { logout } = useAuth();

  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [notifications, setNotifications] = useState(true);

  const themeOptions: { id: ThemePreference; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    {
      id: 'system',
      label: 'System Default',
      desc: 'Matches your Android device theme settings',
      icon: Smartphone,
    },
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Clean, crisp high-contrast light interface',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep dark palette optimized for OLED displays',
      icon: Moon,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors select-none">
      {/* Top Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 z-20">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Theme Section */}
        <div>
          <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Appearance & Theme
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden shadow-xs">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {opt.label}
                      </h4>
                      <p className="text-[11px] text-zinc-400">{opt.desc}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Privacy & Presence */}
        <div>
          <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Privacy & Activity
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden shadow-xs">
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Online Presence
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Show your active status to friends
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOnlineStatus(!showOnlineStatus)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  showOnlineStatus ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    showOnlineStatus ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Read Receipts
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Let contacts see when you read their messages
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReadReceipts(!readReceipts)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  readReceipts ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    readReceipts ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div>
          <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Account Info
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 p-4 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400 shadow-xs">
            <div className="flex justify-between">
              <span className="font-medium text-zinc-400">Email</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {currentProfile.email || 'Google User'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-zinc-400">User ID</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                @{currentProfile.userId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-zinc-400">Account UID</span>
              <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[150px]">
                {currentProfile.uid}
              </span>
            </div>
          </div>
        </div>

        {/* About App */}
        <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-center">
          <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            LinkUp Messenger
          </h4>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Version 1.0.0 • Modern Android Edition
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            if (confirm('Log out from LinkUp Messenger?')) {
              logout();
            }
          }}
          className="w-full py-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Account</span>
        </button>
      </div>
    </div>
  );
};
