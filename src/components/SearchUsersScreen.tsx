/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Search,
  UserPlus,
  Clock,
  Check,
  MessageSquare,
  Loader2,
  AtSign,
  AlertCircle,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  searchUsers,
  checkFriendshipStatus,
  sendFriendRequest,
  FriendshipStatus,
} from '../services/friendService';

interface SearchUsersScreenProps {
  currentUser: UserProfile;
  onOpenChatWithUser: (user: UserProfile) => void;
}

interface SearchResultItem extends UserProfile {
  friendshipStatus: FriendshipStatus;
  isSendingRequest?: boolean;
}

export const SearchUsersScreen: React.FC<SearchUsersScreenProps> = ({
  currentUser,
  onOpenChatWithUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = searchTerm.trim().replace(/^@/, '');
    if (!term) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const usersFound = await searchUsers(term, currentUser.uid);

      // Check friendship status for each user
      const enrichedResults: SearchResultItem[] = await Promise.all(
        usersFound.map(async (u) => {
          const statusObj = await checkFriendshipStatus(currentUser.uid, u.uid);
          return {
            ...u,
            friendshipStatus: statusObj.status,
          };
        })
      );

      setResults(enrichedResults);
    } catch (err: any) {
      console.error('Search failed:', err);
      setError('Failed to search users. Please check connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (targetUser: SearchResultItem) => {
    // Optimistic update
    setResults((prev) =>
      prev.map((item) =>
        item.uid === targetUser.uid ? { ...item, isSendingRequest: true } : item
      )
    );

    try {
      await sendFriendRequest(currentUser, targetUser);
      setResults((prev) =>
        prev.map((item) =>
          item.uid === targetUser.uid
            ? { ...item, friendshipStatus: 'pending_sent', isSendingRequest: false }
            : item
        )
      );
    } catch (err) {
      console.error('Failed to send friend request:', err);
      setResults((prev) =>
        prev.map((item) =>
          item.uid === targetUser.uid ? { ...item, isSendingRequest: false } : item
        )
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors select-none">
      {/* Search Header */}
      <div className="px-5 pt-3 pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          Discover Users
        </h1>

        <form onSubmit={handleSearch} className="relative">
          <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by User ID (e.g. dhiraj247)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 text-sm rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 border border-transparent focus:border-blue-500/30 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-hidden transition-all"
          />
          <button
            type="submit"
            disabled={!searchTerm.trim() || isSearching}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <span>Search</span>
            )}
          </button>
        </form>
      </div>

      {/* Results View */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-500" />
            <span className="text-xs">Searching LinkUp directory...</span>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 mx-auto flex items-center justify-center text-zinc-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No users found
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              We couldn't find any account matching "@{searchTerm}". Make sure the User ID is spelled correctly.
            </p>
          </div>
        ) : !hasSearched ? (
          <div className="text-center py-14 px-6 text-zinc-400">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Find friends by Unique ID
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Every person on LinkUp has a unique handle. Enter their User ID above to send a request or chat.
            </p>
          </div>
        ) : (
          results.map((user) => (
            <motion.div
              key={user.uid}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/50 shadow-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={
                      user.profileImage ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId}`
                    }
                    alt={user.fullName}
                    className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId}`;
                    }}
                  />
                  {user.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {user.fullName}
                  </h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">
                    @{user.userId}
                  </p>
                  {user.bio && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 max-w-[200px]">
                      {user.bio}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Action Button */}
              <div className="shrink-0">
                {user.friendshipStatus === 'friends' ? (
                  <button
                    onClick={() => onOpenChatWithUser(user)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                ) : user.friendshipStatus === 'pending_sent' ? (
                  <div className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Requested</span>
                  </div>
                ) : user.friendshipStatus === 'pending_received' ? (
                  <button
                    onClick={() => onOpenChatWithUser(user)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Respond</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendRequest(user)}
                    disabled={user.isSendingRequest}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1"
                  >
                    {user.isSendingRequest ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Add Friend</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
