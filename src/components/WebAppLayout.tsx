/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  MessageSquare,
  Users,
  Search,
  User,
  Settings,
  MessageSquareShare,
  Sun,
  Moon,
  Smartphone,
  LogOut,
} from 'lucide-react';
import { MainTab, UserProfile } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface WebAppLayoutProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  userProfile: UserProfile;
  unreadChatsCount: number;
  pendingRequestsCount: number;
  activeChat: { chatId: string; otherUser: UserProfile } | null;
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
}

export const WebAppLayout: React.FC<WebAppLayoutProps> = ({
  activeTab,
  onTabChange,
  isSettingsOpen,
  onOpenSettings,
  onCloseSettings,
  userProfile,
  unreadChatsCount,
  pendingRequestsCount,
  activeChat,
  sidebarContent,
  mainContent,
}) => {
  const { theme, setTheme, isDark } = useTheme();
  const { logout } = useAuth();

  const navItems: {
    id: MainTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'chats', label: 'Chats', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'friends', label: 'Friends', icon: Users, badge: pendingRequestsCount },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none">
      {/* ============================================================ */}
      {/* DESKTOP / TABLET NAVIGATION RAIL (Hidden on mobile < md)     */}
      {/* ============================================================ */}
      <aside className="hidden md:flex flex-col items-center justify-between w-18 lg:w-20 py-4 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800/80 z-30 shrink-0">
        {/* Brand App Logo */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 flex items-center justify-center">
            <MessageSquareShare className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold tracking-tight text-blue-600 dark:text-blue-400">
            LinkUp
          </span>
        </div>

        {/* Center Nav Icons */}
        <div className="flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = !isSettingsOpen && activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onCloseSettings();
                  onTabChange(item.id);
                }}
                className={`relative p-3 rounded-2xl transition-all cursor-pointer group flex items-center justify-center ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />

                {/* Badge */}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}

                {/* Tooltip on hover */}
                <span className="absolute left-full ml-3 px-2 py-1 rounded-md bg-zinc-800 text-white text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-md">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Rail Actions: Settings, Theme Toggle, Profile Avatar */}
        <div className="flex flex-col items-center gap-2.5">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={`Theme: ${theme}`}
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-amber-400" />
            ) : theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Smartphone className="w-4 h-4 text-blue-500" />
            )}
          </button>

          {/* Settings button */}
          <button
            onClick={() => {
              if (isSettingsOpen) onCloseSettings();
              else onOpenSettings();
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              isSettingsOpen
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className="w-8 border-t border-zinc-200 dark:border-zinc-800 my-1" />

          {/* User profile avatar with presence */}
          <button
            onClick={() => {
              onCloseSettings();
              onTabChange('profile');
            }}
            className="relative group cursor-pointer"
            title={`${userProfile.fullName} (@${userProfile.userId})`}
          >
            <img
              src={
                userProfile.profileImage ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${userProfile.userId}`
              }
              alt={userProfile.fullName}
              className="w-10 h-10 rounded-full object-cover border-2 border-zinc-200 dark:border-zinc-700 group-hover:scale-105 transition-transform"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* DESKTOP SIDEBAR PANE / MOBILE CONTENT CONTAINER              */}
      {/* ============================================================ */}
      <div
        className={`flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800/80 z-20 shrink-0 transition-all duration-200 ${
          activeChat
            ? 'hidden md:flex md:w-80 lg:w-96'
            : 'w-full md:w-80 lg:w-96'
        }`}
      >
        {sidebarContent}
      </div>

      {/* ============================================================ */}
      {/* MAIN VIEW AREA (CHAT ROOM OR EMPTY STATE CANVAS)            */}
      {/* ============================================================ */}
      <div
        className={`flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative ${
          activeChat ? 'flex' : 'hidden md:flex'
        }`}
      >
        {mainContent}
      </div>
    </div>
  );
};
