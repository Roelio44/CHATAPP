/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MessageSquare, Users, Search, User } from 'lucide-react';
import { MainTab } from '../types';

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
  const tabs: { id: MainTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'friends', label: 'Friends', icon: Users, badge: pendingRequestsCount },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 px-4 py-2 flex items-center justify-around z-30 transition-colors">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-col items-center justify-center relative py-1 px-3 group transition-all"
          >
            <div
              className={`relative px-5 py-1.5 rounded-full transition-all duration-300 flex items-center justify-center ${
                isActive
                  ? 'bg-blue-600/15 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} />

              {/* Notification Badge */}
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-blue-600 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </div>
            <span
              className={`text-[11px] mt-1 font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
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
