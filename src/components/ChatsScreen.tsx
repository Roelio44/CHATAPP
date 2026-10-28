/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Pin,
  MessageSquare,
  UserPlus,
  Sparkles,
  Check,
  CheckCheck,
  MoreVertical,
  Trash2,
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
import { Chat, UserProfile } from '../types';
import { formatMessageTime } from '../utils/formatTime';
import { togglePinChat } from '../services/chatService';

interface ChatsScreenProps {
  currentProfile: UserProfile;
  activeChatId?: string;
  onSelectChat: (chatId: string, otherUser: UserProfile) => void;
  onNavigateToSearch: () => void;
}

export const ChatsScreen: React.FC<ChatsScreenProps> = ({
  currentProfile,
  activeChatId,
  onSelectChat,
  onNavigateToSearch,
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinActionError, setPinActionError] = useState<string | null>(null);

  // Real-time listener for user's chats
  useEffect(() => {
    if (!currentProfile.uid) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentProfile.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const chatList: Chat[] = [];
        const userFetchPromises: Promise<any>[] = [];

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const chatItem: Chat = {
            id: docSnap.id,
            participants: data.participants || [],
            lastMessage: data.lastMessage || '',
            lastSenderId: data.lastSenderId || '',
            lastMessageTime: data.lastMessageTime || data.updatedAt,
            pinnedBy: data.pinnedBy || [],
            unreadCount: data.unreadCount || {},
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };

          // Find the other participant's UID
          const otherUid = chatItem.participants.find((p) => p !== currentProfile.uid);
          if (otherUid) {
            userFetchPromises.push(
              getDoc(doc(db, 'users', otherUid)).then((uSnap) => {
                if (uSnap.exists()) {
                  chatItem.otherUser = uSnap.data() as UserProfile;
                }
              })
            );
          }
          chatList.push(chatItem);
        });

        await Promise.all(userFetchPromises);

        // Sort chats: pinned first, then by lastMessageTime descending
        chatList.sort((a, b) => {
          const aPinned = a.pinnedBy?.includes(currentProfile.uid) ? 1 : 0;
          const bPinned = b.pinnedBy?.includes(currentProfile.uid) ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;

          const timeA = a.lastMessageTime?.toMillis ? a.lastMessageTime.toMillis() : 0;
          const timeB = b.lastMessageTime?.toMillis ? b.lastMessageTime.toMillis() : 0;
          return timeB - timeA;
        });

        setChats(chatList);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching chats:', error);
        handleFirestoreError(error, OperationType.LIST, 'chats');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentProfile.uid]);

  const handleTogglePin = async (e: React.MouseEvent, chat: Chat) => {
    e.stopPropagation();
    setPinActionError(null);
    try {
      await togglePinChat(chat.id, currentProfile.uid, chat.pinnedBy || []);
    } catch (err: any) {
      setPinActionError(err.message || 'Could not pin chat');
      setTimeout(() => setPinActionError(null), 3000);
    }
  };

  const filteredChats = chats.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const otherName = c.otherUser?.fullName.toLowerCase() || '';
    const otherHandle = c.otherUser?.userId.toLowerCase() || '';
    const lastMsg = c.lastMessage?.toLowerCase() || '';
    return otherName.includes(q) || otherHandle.includes(q) || lastMsg.includes(q);
  });

  const pinnedChats = filteredChats.filter((c) => c.pinnedBy?.includes(currentProfile.uid));
  const regularChats = filteredChats.filter((c) => !c.pinnedBy?.includes(currentProfile.uid));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors">
      {/* Top Header */}
      <div className="px-5 pt-3 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Chats
          </h1>
          <button
            onClick={onNavigateToSearch}
            className="p-2 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600/20 active:scale-95 transition-all cursor-pointer"
            title="Start new conversation"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-2xl bg-zinc-200/60 dark:bg-zinc-800/60 border border-transparent focus:border-blue-500/30 dark:focus:border-blue-500/30 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:outline-hidden transition-all"
          />
        </div>

        {pinActionError && (
          <div className="mt-2 text-xs text-rose-500 font-medium">
            {pinActionError}
          </div>
        )}
      </div>

      {/* Chat List Body */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {loading ? (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900 animate-pulse"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="w-1/3 h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
                  <div className="w-2/3 h-3 bg-zinc-200 dark:bg-zinc-800 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          /* Empty State - No Dummy Data! */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
              No conversations yet
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-xs">
              Search users by their unique User ID to connect and start chatting in real time.
            </p>
            <button
              onClick={onNavigateToSearch}
              className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Find Users</span>
            </button>
          </div>
        ) : (
          <>
            {/* Pinned Chats Section */}
            {pinnedChats.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  <Pin className="w-3 h-3 rotate-45 text-blue-500" />
                  <span>Pinned Chats ({pinnedChats.length}/3)</span>
                </div>
                <div className="space-y-1.5">
                  {pinnedChats.map((chat) => (
                    <ChatCard
                      key={chat.id}
                      chat={chat}
                      currentUserId={currentProfile.uid}
                      isPinned={true}
                      isSelected={activeChatId === chat.id}
                      onSelect={() => chat.otherUser && onSelectChat(chat.id, chat.otherUser)}
                      onTogglePin={(e) => handleTogglePin(e, chat)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Recent Chats Section */}
            {regularChats.length > 0 && (
              <div>
                {pinnedChats.length > 0 && (
                  <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Recent Conversations
                  </div>
                )}
                <div className="space-y-1.5">
                  {regularChats.map((chat) => (
                    <ChatCard
                      key={chat.id}
                      chat={chat}
                      currentUserId={currentProfile.uid}
                      isPinned={false}
                      isSelected={activeChatId === chat.id}
                      onSelect={() => chat.otherUser && onSelectChat(chat.id, chat.otherUser)}
                      onTogglePin={(e) => handleTogglePin(e, chat)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredChats.length === 0 && searchQuery && (
              <div className="text-center py-10 text-xs text-zinc-400">
                No chats matching "{searchQuery}"
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface ChatCardProps {
  chat: Chat;
  currentUserId: string;
  isPinned: boolean;
  isSelected?: boolean;
  onSelect: () => void;
  onTogglePin: (e: React.MouseEvent) => void;
}

const ChatCard: React.FC<ChatCardProps> = ({
  chat,
  currentUserId,
  isPinned,
  isSelected,
  onSelect,
  onTogglePin,
}) => {
  const other = chat.otherUser;
  const unreadCount = chat.unreadCount?.[currentUserId] || 0;
  const hasUnread = unreadCount > 0;
  const isLastSender = chat.lastSenderId === currentUserId;

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer select-none active:scale-[0.99] ${
        isSelected
          ? 'bg-blue-600/15 dark:bg-blue-500/20 border border-blue-500/30'
          : hasUnread
          ? 'bg-blue-50/70 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30'
          : 'bg-white/80 dark:bg-zinc-900/70 hover:bg-white dark:hover:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/40'
      }`}
    >
      {/* Profile Image & Online Status */}
      <div className="relative shrink-0">
        <img
          src={
            other?.profileImage ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${other?.userId || chat.id}`
          }
          alt={other?.fullName || 'User'}
          className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${chat.id}`;
          }}
        />
        {other?.isOnline && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
        )}
      </div>

      {/* Name & Last Message Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {other?.fullName || 'LinkUp User'}
          </h4>
          <span
            className={`text-[11px] shrink-0 font-medium ${
              hasUnread
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-zinc-400 dark:text-zinc-500'
            }`}
          >
            {formatMessageTime(chat.lastMessageTime)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate ${
              hasUnread
                ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {isLastSender && (
              <span className="text-zinc-400 font-normal mr-1">You:</span>
            )}
            {chat.lastMessage || <span className="italic text-zinc-400">Say hello!</span>}
          </p>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Pin action button on hover / active */}
            <button
              onClick={onTogglePin}
              title={isPinned ? 'Unpin chat' : 'Pin chat'}
              className={`p-1 rounded-full transition-all ${
                isPinned
                  ? 'text-blue-500 hover:text-blue-600'
                  : 'text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-500'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'rotate-45 fill-current' : ''}`} />
            </button>

            {/* Unread badge */}
            {hasUnread && (
              <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
