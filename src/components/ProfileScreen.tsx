/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Settings,
  Edit3,
  Copy,
  Check,
  Share2,
  Users,
  MessageSquare,
  Shield,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { EditProfileModal } from './EditProfileModal';
import { db, collection, query, where, getDocs } from '../firebase/config';

interface ProfileScreenProps {
  currentProfile: UserProfile;
  onNavigateToSettings: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentProfile,
  onNavigateToSettings,
}) => {
  const { logout } = useAuth();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  const [chatsCount, setChatsCount] = useState<number | null>(null);

  useEffect(() => {
    if (!currentProfile.uid) return;

    // Fetch friend count
    const fetchStats = async () => {
      try {
        const friendsSnap = await getDocs(
          query(collection(db, 'friends'), where('uid', '==', currentProfile.uid))
        );
        setFriendsCount(friendsSnap.size);

        const chatsSnap = await getDocs(
          query(collection(db, 'chats'), where('participants', 'array-contains', currentProfile.uid))
        );
        setChatsCount(chatsSnap.size);
      } catch (e) {
        console.warn('Failed to load stats', e);
      }
    };

    fetchStats();
  }, [currentProfile.uid]);

  const copyUserId = () => {
    navigator.clipboard.writeText(`@${currentProfile.userId}`);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          My Profile
        </h1>
        <button
          onClick={onNavigateToSettings}
          className="p-2 rounded-full bg-zinc-200/60 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5">
        {/* Profile Card */}
        <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 shadow-xs flex flex-col items-center text-center">
          <div className="relative mb-3">
            <img
              src={
                currentProfile.profileImage ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${currentProfile.userId}`
              }
              alt={currentProfile.fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-blue-500/20 shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${currentProfile.userId}`;
              }}
            />
            <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-3 border-white dark:border-zinc-900" />
          </div>

          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {currentProfile.fullName}
          </h2>

          <div
            onClick={copyUserId}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-mono font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 cursor-pointer transition-colors"
            title="Click to copy User ID"
          >
            <span>@{currentProfile.userId}</span>
            {copiedHandle ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 opacity-70" />
            )}
          </div>

          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 max-w-xs leading-relaxed">
            {currentProfile.bio || 'Available on LinkUp Messenger'}
          </p>

          <button
            onClick={() => setIsEditOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {friendsCount !== null ? friendsCount : '...'}
              </span>
              <p className="text-[11px] text-zinc-400">Total Friends</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {chatsCount !== null ? chatsCount : '...'}
              </span>
              <p className="text-[11px] text-zinc-400">Active Chats</p>
            </div>
          </div>
        </div>

        {/* Quick Menu */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden shadow-xs">
          <button
            onClick={onNavigateToSettings}
            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                App Settings & Preferences
              </span>
            </div>
            <span className="text-xs text-zinc-400">›</span>
          </button>

          <button
            onClick={copyUserId}
            className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Share2 className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                Share My User ID
              </span>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
              @{currentProfile.userId}
            </span>
          </button>
        </div>

        {/* Logout Action */}
        <div className="pt-2">
          <button
            onClick={() => {
              if (confirm('Log out from LinkUp Messenger?')) {
                logout();
              }
            }}
            className="w-full py-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/20 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        currentProfile={currentProfile}
      />
    </div>
  );
};
