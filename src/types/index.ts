/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  userId: string; // unique handle e.g. "dhiraj247"
  profileImage: string;
  bio?: string;
  isOnline: boolean;
  lastSeen: any; // Firestore Timestamp or ISO string
  createdAt: any;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  senderName: string;
  senderUserId: string;
  senderProfileImage: string;
  createdAt: any;
}

export interface Friend {
  id: string;
  uid: string;
  friendUid: string;
  friendName: string;
  friendUserId: string;
  friendProfileImage: string;
  createdAt: any;
  isOnline?: boolean;
  lastSeen?: any;
}

export interface Chat {
  id: string;
  participants: string[]; // [uidA, uidB]
  lastMessage?: string;
  lastSenderId?: string;
  lastMessageTime?: any;
  pinnedBy?: string[]; // uids who have pinned this chat (max 3 per user)
  unreadCount?: Record<string, number>; // { [uid]: count }
  createdAt: any;
  updatedAt: any;
  // Computed/joined fields for the UI
  otherUser?: UserProfile;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: any;
  seen: boolean;
  delivered: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

export type ThemePreference = 'system' | 'light' | 'dark';

export type MainTab = 'chats' | 'friends' | 'search' | 'profile';
