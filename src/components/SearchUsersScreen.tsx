/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  UserPlus,
  Clock,
  Check,
  MessageSquare,
  Loader2,
  AtSign,
  AlertCircle,
  X,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { UserProfile } from '../types';
import {
  searchUsers,
  getSuggestedUsers,
  checkFriendshipStatus,
  sendFriendRequest,
  FriendshipStatus,
} from '../services/friendService';
import { VerifiedBadge } from './VerifiedBadge';

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
  const [suggestedUsers, setSuggestedUsers] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to enrich a list of users with their friendship status relative to currentUser
  const enrichUsersWithStatus = useCallback(
    async (users: UserProfile[]): Promise<SearchResultItem[]> => {
      return Promise.all(
        users.map(async (u) => {
          try {
            const statusObj = await checkFriendshipStatus(currentUser.uid, u.uid);
            return {
              ...u,
              friendshipStatus: statusObj.status,
            };
          } catch (e) {
            return {
              ...u,
              friendshipStatus: 'none' as FriendshipStatus,
            };
          }
        })
      );
    },
    [currentUser.uid]
  );

  // Load initial suggested users on mount so user never sees a blank screen
  const loadSuggestedUsers = useCallback(async () => {
    setIsLoadingInitial(true);
    setError(null);
    try {
      const suggested = await getSuggestedUsers(currentUser.uid);
      const enriched = await enrichUsersWithStatus(suggested);
      setSuggestedUsers(enriched);
    } catch (err: any) {
      console.warn('Notice loading suggested users:', err);
    } finally {
      setIsLoadingInitial(false);
    }
  }, [currentUser.uid, enrichUsersWithStatus]);

  useEffect(() => {
    loadSuggestedUsers();
  }, [loadSuggestedUsers]);

  // Execute search
  const executeSearch = useCallback(
    async (queryText: string) => {
      const clean = queryText.trim().replace(/^@/, '');
      if (!clean) {
        setHasSearched(false);
        setResults([]);
        return;
      }

      setIsSearching(true);
      setError(null);
      setHasSearched(true);

      try {
        const found = await searchUsers(clean, currentUser.uid);
        const enriched = await enrichUsersWithStatus(found);
        setResults(enriched);
      } catch (err: any) {
        console.warn('Search error:', err);
        setError('Unable to load users. Showing available directory below.');
      } finally {
        setIsSearching(false);
      }
    },
    [currentUser.uid, enrichUsersWithStatus]
  );

  // Debounced search on typing
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setHasSearched(false);
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      executeSearch(trimmed);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchTerm, executeSearch]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      executeSearch(searchTerm);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    setHasSearched(false);
    setResults([]);
  };

  const handleSendRequest = async (targetUser: SearchResultItem) => {
    // Optimistic update
    const updateList = (list: SearchResultItem[]) =>
      list.map((item) =>
        item.uid === targetUser.uid ? { ...item, isSendingRequest: true } : item
      );

    setResults(updateList);
    setSuggestedUsers(updateList);

    try {
      await sendFriendRequest(currentUser, targetUser);
      const finishUpdate = (list: SearchResultItem[]) =>
        list.map((item) =>
          item.uid === targetUser.uid
            ? { ...item, friendshipStatus: 'pending_sent' as FriendshipStatus, isSendingRequest: false }
            : item
        );
      setResults(finishUpdate);
      setSuggestedUsers(finishUpdate);
    } catch (err) {
      console.error('Failed to send friend request:', err);
      const revertUpdate = (list: SearchResultItem[]) =>
        list.map((item) =>
          item.uid === targetUser.uid ? { ...item, isSendingRequest: false } : item
        );
      setResults(revertUpdate);
      setSuggestedUsers(revertUpdate);
    }
  };

  const activeDisplayList = hasSearched ? results : suggestedUsers;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors select-none">
      {/* Search Header */}
      <div className="px-4 lg:px-5 pt-3 pb-3 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Discover People
          </h1>
          <button
            onClick={loadSuggestedUsers}
            disabled={isLoadingInitial || isSearching}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingInitial ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <form onSubmit={handleManualSearch} className="relative">
          <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by username (@handle), name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-20 py-2.5 text-sm rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 border border-transparent focus:border-blue-500/30 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-hidden transition-all shadow-inner"
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-300/40 dark:hover:bg-zinc-700/50 cursor-pointer"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="submit"
              disabled={!searchTerm.trim() || isSearching}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Search</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Sub-header status */}
      <div className="px-5 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between shrink-0">
        <span>
          {hasSearched
            ? `Search Results (${results.length})`
            : `Suggested for You (${suggestedUsers.length})`}
        </span>
        {!hasSearched && (
          <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 normal-case font-medium">
            <Sparkles className="w-3 h-3" />
            <span>Active Members</span>
          </span>
        )}
      </div>

      {/* Results View */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5">
        {error && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isSearching || isLoadingInitial ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-blue-500" />
            <span className="text-xs">
              {isSearching ? 'Searching LinkUp directory...' : 'Loading members...'}
            </span>
          </div>
        ) : hasSearched && results.length === 0 ? (
          <div className="text-center py-14 px-4">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 mx-auto flex items-center justify-center text-zinc-400 mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              No matching accounts found
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
              We couldn't find anyone matching "{searchTerm}". Try searching by handle (@username) or full name.
            </p>
            <button
              onClick={handleClear}
              className="mt-4 px-4 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-xs font-medium transition-colors cursor-pointer"
            >
              View Suggested Users
            </button>
          </div>
        ) : activeDisplayList.length === 0 ? (
          <div className="text-center py-14 px-6 text-zinc-400">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Find Friends on LinkUp
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Search by Unique User ID (@handle) or name above to start chatting and sending friend requests.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {activeDisplayList.map((user) => (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900/90 border border-zinc-200/70 dark:border-zinc-800/70 shadow-xs hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={
                        user.profileImage ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId || user.uid}`
                      }
                      alt={user.fullName}
                      className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId || user.uid}`;
                      }}
                    />
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900 shadow-xs" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {user.fullName}
                      </h4>
                      {user.isVerified && <VerifiedBadge size="xs" />}
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">
                      @{user.userId || user.uid.slice(0, 8)}
                    </p>
                    {user.bio && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 max-w-[200px] lg:max-w-[260px]">
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
                      className="px-3 py-1.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-1"
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
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
