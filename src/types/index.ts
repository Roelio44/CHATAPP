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
  isVerified?: boolean; // Blue tick verified account
  verifiedAt?: any;
  isBanned?: boolean; // Admin moderation ban
  banReason?: string;
  bannedAt?: any;
  role?: 'user' | 'admin';
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
  imageUrl?: string;
  isViewOnce?: boolean;
  viewOnceOpened?: boolean;
  viewOnceOpenedAt?: any;
  audioUrl?: string; // base64 data URL for voice note
  audioDuration?: number; // duration in seconds
  timestamp: any;
  seen: boolean;
  delivered: boolean;
  reactions?: Record<string, string[]>; // { [emoji]: [userId1, userId2] }
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

export interface SystemAlert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'urgent' | 'announcement';
  isActive: boolean;
  createdAt: any;
  createdBy: string;
}

export type CallType = 'audio' | 'video';

export interface CallSession {
  callId: string;
  chatId: string;
  callerId: string;
  callerName: string;
  callerImage: string;
  callerUserId?: string;
  receiverId: string;
  type: CallType;
  status: 'calling' | 'accepted' | 'declined' | 'ended';
  offer?: any;
  answer?: any;
  createdAt: any;
  endedAt?: any;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export type MainTab = 'chats' | 'friends' | 'search' | 'profile' | 'admin';
