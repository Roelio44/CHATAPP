/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  UserPlus,
  MessageSquare,
  UserCheck,
  Check,
  X,
  Clock,
  MoreVertical,
  UserX,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import { Friend, FriendRequest, UserProfile } from '../types';
import {
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '../services/friendService';
import { formatLastSeen } from '../utils/formatTime';

interface FriendsScreenProps {
  currentProfile: UserProfile;
  onOpenChatWithUser: (user: UserProfile) => void;
  onNavigateToSearch: () => void;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({
  currentProfile,
  onOpenChatWithUser,
  onNavigateToSearch,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'requests'>('all');
  const [friends, setFriends] = useState<(Friend & { userProfile?: UserProfile })[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Real-time listener for friends
  useEffect(() => {
    if (!currentProfile.uid) return;

    const friendsRef = collection(db, 'friends');
    const q = query(friendsRef, where('uid', '==', currentProfile.uid));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const list: (Friend & { userProfile?: UserProfile })[] = [];
        const userPromises: Promise<any>[] = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data() as Friend;
          const friendItem: Friend & { userProfile?: UserProfile } = { ...data, id: docSnap.id };

          userPromises.push(
            getDoc(doc(db, 'users', data.friendUid)).then((uSnap) => {
              if (uSnap.exists()) {
                friendItem.userProfile = uSnap.data() as UserProfile;
              }
            })
          );

          list.push(friendItem);
        });

        await Promise.all(userPromises);
        setFriends(list);
        setLoadingFriends(false);
      },
      (error) => {
        console.error('Error listening to friends:', error);
        handleFirestoreError(error, OperationType.LIST, 'friends');
        setLoadingFriends(false);
      }
    );

    return () => unsubscribe();
  }, [currentProfile.uid]);

  // Real-time listener for friend requests (both incoming & outgoing)
  useEffect(() => {
    if (!currentProfile.uid) return;

    const requestsRef = collection(db, 'friendRequests');

    // Incoming requests
    const incomingQ = query(
      requestsRef,
      where('receiverId', '==', currentProfile.uid),
      where('status', '==', 'pending')
    );
    const unsubIn = onSnapshot(incomingQ, (snapshot) => {
      const incList: FriendRequest[] = [];
      snapshot.docs.forEach((d) => incList.push({ id: d.id, ...d.data() } as FriendRequest));
      setIncomingRequests(incList);
      setLoadingRequests(false);
    });

    // Outgoing requests
    const outgoingQ = query(
      requestsRef,
      where('senderId', '==', currentProfile.uid),
      where('status', '==', 'pending')
    );
    const unsubOut = onSnapshot(outgoingQ, (snapshot) => {
      const outList: FriendRequest[] = [];
      snapshot.docs.forEach((d) => outList.push({ id: d.id, ...d.data() } as FriendRequest));
      setOutgoingRequests(outList);
    });

    return () => {
      unsubIn();
      unsubOut();
    };
  }, [currentProfile.uid]);

  const handleAcceptRequest = async (request: FriendRequest) => {
    try {
      await acceptFriendRequest(request, currentProfile);
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
    } catch (err) {
      console.error('Error rejecting friend request:', err);
    }
  };

  const handleRemoveFriend = async (friendUid: string) => {
    if (confirm('Are you sure you want to remove this friend?')) {
      try {
        await removeFriend(currentProfile.uid, friendUid);
      } catch (err) {
        console.error('Error removing friend:', err);
      }
    }
  };

  const filteredFriends = friends.filter((f) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const name = f.friendName.toLowerCase();
    const handle = f.friendUserId.toLowerCase();
    return name.includes(q) || handle.includes(q);
  });

  const onlineFriends = filteredFriends.filter((f) => f.userProfile?.isOnline);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors select-none">
      {/* Header */}
      <div className="px-5 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Friends
          </h1>
          <button
            onClick={onNavigateToSearch}
            className="p-2 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 active:scale-95 transition-all cursor-pointer"
            title="Add new friend"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle: All Friends vs Requests */}
        <div className="flex items-center gap-1 p-1 bg-zinc-200/60 dark:bg-zinc-900 rounded-xl mb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            All Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'requests'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            <span>Requests</span>
            {incomingRequests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Search bar when viewing All Friends */}
        {activeTab === 'all' && friends.length > 0 && (
          <div className="relative mt-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter friends..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-1.5 text-xs rounded-xl bg-zinc-200/60 dark:bg-zinc-800/60 border border-transparent focus:border-blue-500/30 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-hidden transition-all"
            />
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {activeTab === 'all' ? (
          loadingFriends ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"
                >
                  <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="w-1/3 h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
                    <div className="w-1/4 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : friends.length === 0 ? (
            /* Clean Empty State - No Fake Content */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
                No friends added yet
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
                Search for other users by their unique User ID to send a request and build your network.
              </p>
              <button
                onClick={onNavigateToSearch}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Search Users</span>
              </button>
            </div>
          ) : (
            <>
              {/* Online Friends Highlights */}
              {onlineFriends.length > 0 && !searchFilter && (
                <div>
                  <div className="flex items-center gap-1.5 px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Active Now ({onlineFriends.length})</span>
                  </div>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {onlineFriends.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => f.userProfile && onOpenChatWithUser(f.userProfile)}
                        className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer"
                      >
                        <div className="relative">
                          <img
                            src={
                              f.userProfile?.profileImage ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${f.friendUserId}`
                            }
                            alt={f.friendName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950" />
                        </div>
                        <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 max-w-16 truncate">
                          {f.friendName.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* All Friends List */}
              <div className="space-y-2">
                <div className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  All Friends ({filteredFriends.length})
                </div>

                {filteredFriends.map((friend) => {
                  const userObj = friend.userProfile || {
                    uid: friend.friendUid,
                    fullName: friend.friendName,
                    email: '',
                    userId: friend.friendUserId,
                    profileImage: friend.friendProfileImage,
                    isOnline: false,
                    lastSeen: null,
                    createdAt: null,
                  };

                  return (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800/50 shadow-xs group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={
                              friend.friendProfileImage ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.friendUserId}`
                            }
                            alt={friend.friendName}
                            className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.friendUserId}`;
                            }}
                          />
                          {friend.userProfile?.isOnline && (
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {friend.friendName}
                          </h4>
                          <p className="text-xs text-zinc-400 font-mono truncate">
                            @{friend.friendUserId}
                          </p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {formatLastSeen(friend.userProfile?.isOnline, friend.userProfile?.lastSeen)}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onOpenChatWithUser(userObj)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.friendUid)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Remove friend"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        ) : (
          /* Friend Requests Section */
          <div className="space-y-5">
            {/* Incoming Requests */}
            <div>
              <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Received Requests ({incomingRequests.length})</span>
              </div>

              {incomingRequests.length === 0 ? (
                <div className="text-center py-6 px-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 text-xs text-zinc-400">
                  No incoming friend requests right now.
                </div>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            req.senderProfileImage ||
                            `https://api.dicebear.com/7.x/bottts/svg?seed=${req.senderUserId}`
                          }
                          alt={req.senderName}
                          className="w-11 h-11 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {req.senderName}
                          </h4>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">
                            @{req.senderUserId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.id)}
                          className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Requests */}
            <div>
              <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Sent Requests ({outgoingRequests.length})</span>
              </div>

              {outgoingRequests.length === 0 ? (
                <div className="text-center py-6 px-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 text-xs text-zinc-400">
                  No pending sent requests.
                </div>
              ) : (
                <div className="space-y-2">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 shadow-xs"
                    >
                      <div className="min-w-0">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                          Request sent to user
                        </span>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Awaiting response</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-2.5 py-1 text-xs text-zinc-500 hover:text-rose-600 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-rose-300 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
