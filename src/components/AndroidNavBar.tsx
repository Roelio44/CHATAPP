/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MessageSquare, Users, Search, User, ShieldCheck } from 'lucide-react';
import { MainTab } from '../types';
import { useAuth } from '../context/AuthContext';

interface AndroidNavBarProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  unreadChatsCount?: number;
  pendingRequestsCount?: number;
}

export const AndroidNavBar: React.FC<AndroidNavBarProps> = ({
  activeTab,
  onTabChange,
  unreadChatsCount = 0,
  pendingRequestsCount = 0,
}) => {
  const { isAdmin } = useAuth();

  const tabs: {
    id: MainTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    isAdminOnly?: boolean;
  }[] = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'friends', label: 'Friends', icon: Users, badge: pendingRequestsCount },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  if (isAdmin) {
    tabs.push({
      id: 'admin',
      label: 'Admin',
      icon: ShieldCheck,
      isAdminOnly: true,
    });
  }

  return (
    <nav className="w-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] flex items-center justify-around z-30 transition-colors app-chrome">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => {
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                try {
                  navigator.vibrate(15);
                } catch (e) {}
              }
              onTabChange(tab.id);
            }}
            className="min-h-[48px] min-w-[54px] flex flex-col items-center justify-center relative py-1 px-2.5 rounded-2xl touch-manipulation active:scale-90 transition-transform cursor-pointer"
          >
            <div
              className={`relative px-4 py-1.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                isActive
                  ? tab.isAdminOnly
                    ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 shadow-xs'
                    : 'bg-blue-600/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-xs'
                  : tab.isAdminOnly
                  ? 'text-amber-500/80 hover:text-amber-600'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}
              />

              {/* Notification Badge */}
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </div>
            <span
              className={`text-[10px] mt-0.5 font-medium transition-colors ${
                isActive
                  ? tab.isAdminOnly
                    ? 'text-amber-600 dark:text-amber-400 font-bold'
                    : 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
