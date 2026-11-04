/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Chat, Message, UserProfile, Friend, FriendRequest } from '../types';

export const DEMO_USERS: UserProfile[] = [
  {
    uid: 'demo_contact_1',
    fullName: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    userId: 'alex_rivera',
    profileImage: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
    bio: 'Mobile software developer • Building modern apps',
    isOnline: true,
    lastSeen: new Date(),
    createdAt: new Date(),
  },
  {
    uid: 'demo_contact_2',
    fullName: 'Sophia Chen',
    email: 'sophia.chen@example.com',
    userId: 'sophiac',
    profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
    bio: 'UI/UX Designer & coffee lover ☕',
    isOnline: false,
    lastSeen: new Date(Date.now() - 1000 * 60 * 35), // 35 min ago
    createdAt: new Date(),
  },
  {
    uid: 'demo_contact_3',
    fullName: 'LinkUp Bot',
    email: 'support@linkup.app',
    userId: 'linkup_bot',
    profileImage: 'https://api.dicebear.com/7.x/bottts/svg?seed=linkup_official',
    bio: 'Official LinkUp Messenger assistant',
    isOnline: true,
    lastSeen: new Date(),
    createdAt: new Date(),
  },
];

export const INITIAL_DEMO_CHATS: Chat[] = [
  {
    id: 'demo_chat_1',
    participants: ['demo_user_linkup', 'demo_contact_1'],
    lastMessage: 'Hey! LinkUp Messenger is running directly on your mobile device!',
    lastSenderId: 'demo_contact_1',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 4),
    pinnedBy: ['demo_user_linkup'],
    unreadCount: { demo_user_linkup: 1 },
    createdAt: new Date(),
    updatedAt: new Date(),
    otherUser: DEMO_USERS[0],
  },
  {
    id: 'demo_chat_2',
    participants: ['demo_user_linkup', 'demo_contact_2'],
    lastMessage: 'Let me know what you think of the new dark mode theme!',
    lastSenderId: 'demo_contact_2',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 55),
    pinnedBy: [],
    unreadCount: { demo_user_linkup: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    otherUser: DEMO_USERS[1],
  },
  {
    id: 'demo_chat_3',
    participants: ['demo_user_linkup', 'demo_contact_3'],
    lastMessage: 'Welcome to LinkUp! You are connected in real-time.',
    lastSenderId: 'demo_contact_3',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 120),
    pinnedBy: [],
    unreadCount: { demo_user_linkup: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    otherUser: DEMO_USERS[2],
  },
];

export const INITIAL_DEMO_MESSAGES: Record<string, Message[]> = {
  demo_chat_1: [
    {
      id: 'msg_101',
      chatId: 'demo_chat_1',
      senderId: 'demo_contact_1',
      text: 'Hello! Welcome to LinkUp Messenger!',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      seen: true,
      delivered: true,
    },
    {
      id: 'msg_102',
      chatId: 'demo_chat_1',
      senderId: 'demo_user_linkup',
      text: 'Testing on mobile at 192.168.0.227!',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      seen: true,
      delivered: true,
    },
    {
      id: 'msg_103',
      chatId: 'demo_chat_1',
      senderId: 'demo_contact_1',
      text: 'Hey! LinkUp Messenger is running directly on your mobile device!',
      timestamp: new Date(Date.now() - 1000 * 60 * 4),
      seen: false,
      delivered: true,
    },
  ],
  demo_chat_2: [
    {
      id: 'msg_201',
      chatId: 'demo_chat_2',
      senderId: 'demo_contact_2',
      text: 'Hi there! The UI looks super clean.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      seen: true,
      delivered: true,
    },
    {
      id: 'msg_202',
      chatId: 'demo_chat_2',
      senderId: 'demo_contact_2',
      text: 'Let me know what you think of the new dark mode theme!',
      timestamp: new Date(Date.now() - 1000 * 60 * 55),
      seen: true,
      delivered: true,
    },
  ],
  demo_chat_3: [
    {
      id: 'msg_301',
      chatId: 'demo_chat_3',
      senderId: 'demo_contact_3',
      text: 'Welcome to LinkUp! You are connected in real-time.',
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      seen: true,
      delivered: true,
    },
  ],
};

const STORAGE_CHATS_KEY = 'linkup_demo_chats';
const STORAGE_MESSAGES_KEY = 'linkup_demo_messages';

export function getDemoChats(): Chat[] {
  try {
    const raw = localStorage.getItem(STORAGE_CHATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(INITIAL_DEMO_CHATS));
  return INITIAL_DEMO_CHATS;
}

export function saveDemoChats(chats: Chat[]) {
  try {
    localStorage.setItem(STORAGE_CHATS_KEY, JSON.stringify(chats));
    window.dispatchEvent(new CustomEvent('linkup_demo_chats_updated'));
  } catch (e) {}
}

export function getDemoMessages(chatId: string): Message[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_MESSAGES_KEY}_${chatId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const initial = INITIAL_DEMO_MESSAGES[chatId] || [];
  localStorage.setItem(`${STORAGE_MESSAGES_KEY}_${chatId}`, JSON.stringify(initial));
  return initial;
}

export function sendDemoMessage(
  chatId: string,
  senderId: string,
  text: string,
  replyTo?: { id: string; text: string; senderName: string },
  imageUrl?: string,
  options?: {
    isViewOnce?: boolean;
    audioUrl?: string;
    audioDuration?: number;
  }
): Message {
  const current = getDemoMessages(chatId);
  let preview = text.trim();
  if (!preview) {
    if (options?.audioUrl) {
      const dur = Math.round(options?.audioDuration || 0);
      const m = Math.floor(dur / 60);
      const s = dur % 60;
      preview = `🎤 Voice message (${m}:${s.toString().padStart(2, '0')})`;
    } else if (imageUrl) {
      preview = options?.isViewOnce ? '🔒 View once photo' : '📷 Photo';
    }
  } else if (options?.isViewOnce) {
    preview = `🔒 View once photo • ${text.trim()}`;
  }

  const newMsg: Message = {
    id: `msg_${Date.now()}`,
    chatId,
    senderId,
    text: text.trim(),
    imageUrl,
    isViewOnce: options?.isViewOnce,
    viewOnceOpened: options?.isViewOnce ? false : undefined,
    audioUrl: options?.audioUrl,
    audioDuration: options?.audioDuration,
    timestamp: new Date(),
    seen: false,
    delivered: true,
    replyTo,
  };
  const updated = [...current, newMsg];
  try {
    localStorage.setItem(`${STORAGE_MESSAGES_KEY}_${chatId}`, JSON.stringify(updated));
  } catch (e) {}

  // Update chat last message
  const chats = getDemoChats();
  const targetIndex = chats.findIndex((c) => c.id === chatId);
  if (targetIndex >= 0) {
    chats[targetIndex].lastMessage = preview;
    chats[targetIndex].lastSenderId = senderId;
    chats[targetIndex].lastMessageTime = new Date();
    saveDemoChats(chats);
  }

  window.dispatchEvent(new CustomEvent(`linkup_demo_msg_${chatId}`, { detail: newMsg }));

  // Auto-reply simulation for interactive experience
  setTimeout(() => {
    const replyMsg: Message = {
      id: `msg_auto_${Date.now()}`,
      chatId,
      senderId: chats[targetIndex]?.participants.find((p) => p !== senderId) || 'demo_contact_1',
      text: `Got your message: "${text.trim()}". Real-time communication on LinkUp is active!`,
      timestamp: new Date(),
      seen: false,
      delivered: true,
    };
    const latest = getDemoMessages(chatId);
    try {
      localStorage.setItem(`${STORAGE_MESSAGES_KEY}_${chatId}`, JSON.stringify([...latest, replyMsg]));
    } catch (e) {}

    const updatedChats = getDemoChats();
    const idx = updatedChats.findIndex((c) => c.id === chatId);
    if (idx >= 0) {
      updatedChats[idx].lastMessage = replyMsg.text;
      updatedChats[idx].lastSenderId = replyMsg.senderId;
      updatedChats[idx].lastMessageTime = new Date();
      saveDemoChats(updatedChats);
    }
    window.dispatchEvent(new CustomEvent(`linkup_demo_msg_${chatId}`, { detail: replyMsg }));
  }, 1200);

  return newMsg;
}

export function markDemoViewOnceAsOpened(chatId: string, messageId: string) {
  const current = getDemoMessages(chatId);
  const updated = current.map((m) =>
    m.id === messageId ? { ...m, viewOnceOpened: true } : m
  );
  try {
    localStorage.setItem(`${STORAGE_MESSAGES_KEY}_${chatId}`, JSON.stringify(updated));
  } catch (e) {}
  window.dispatchEvent(new CustomEvent(`linkup_demo_msg_${chatId}`));
}
