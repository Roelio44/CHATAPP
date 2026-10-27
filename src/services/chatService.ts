/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import { Chat, Message } from '../types';

export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export async function getOrCreateChat(currentUserId: string, friendUid: string): Promise<string> {
  const chatId = getChatId(currentUserId, friendUid);
  const chatRef = doc(db, 'chats', chatId);

  try {
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
      const newChatData = {
        chatId,
        participants: [currentUserId, friendUid],
        lastMessage: '',
        lastSenderId: '',
        lastMessageTime: serverTimestamp(),
        pinnedBy: [],
        unreadCount: {
          [currentUserId]: 0,
          [friendUid]: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(chatRef, newChatData);
    }
    return chatId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
    return chatId;
  }
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  receiverId: string,
  text: string,
  replyTo?: { id: string; text: string; senderName: string }
): Promise<string> {
  if (!text.trim()) return '';

  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const chatRef = doc(db, 'chats', chatId);

  try {
    // 1. Add message document to subcollection
    const msgDoc = await addDoc(messagesRef, {
      chatId,
      senderId,
      text: text.trim(),
      timestamp: serverTimestamp(),
      delivered: true,
      seen: false,
      replyTo: replyTo || null,
    });

    // 2. Update chat parent doc
    const chatSnap = await getDoc(chatRef);
    let currentUnread = 0;
    if (chatSnap.exists()) {
      const data = chatSnap.data();
      currentUnread = data?.unreadCount?.[receiverId] || 0;
    }

    await updateDoc(chatRef, {
      lastMessage: text.trim(),
      lastSenderId: senderId,
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
      [`unreadCount.${receiverId}`]: currentUnread + 1,
    });

    return msgDoc.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages`);
    return '';
  }
}

export async function markMessagesAsSeen(chatId: string, currentUserId: string): Promise<void> {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const unseenQ = query(
      messagesRef,
      where('seen', '==', false)
    );
    const unseenSnap = await getDocs(unseenQ);

    const updates: Promise<any>[] = [];
    unseenSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.senderId !== currentUserId) {
        updates.push(updateDoc(docSnap.ref, { seen: true }));
      }
    });

    // Reset unread count for current user
    const chatRef = doc(db, 'chats', chatId);
    updates.push(
      updateDoc(chatRef, {
        [`unreadCount.${currentUserId}`]: 0,
      }).catch(() => {})
    );

    await Promise.all(updates);
  } catch (err) {
    // Best-effort seen tracking
    console.warn('Could not mark messages as seen:', err);
  }
}

export async function togglePinChat(
  chatId: string,
  currentUserId: string,
  currentPinnedList: string[]
): Promise<boolean> {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const isPinned = currentPinnedList.includes(currentUserId);

    let updatedPinned: string[];
    if (isPinned) {
      updatedPinned = currentPinnedList.filter((uid) => uid !== currentUserId);
    } else {
      // Check maximum 3 pinned chats
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('pinnedBy', 'array-contains', currentUserId));
      const snap = await getDocs(q);
      if (snap.size >= 3) {
        throw new Error('You can only pin up to 3 chats.');
      }
      updatedPinned = [...currentPinnedList, currentUserId];
    }

    await updateDoc(chatRef, {
      pinnedBy: updatedPinned,
    });
    return !isPinned;
  } catch (err: any) {
    console.error('Error toggling pin:', err);
    throw err;
  }
}
