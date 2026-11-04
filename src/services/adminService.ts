/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import { UserProfile, Chat, Message, SystemAlert } from '../types';

export const SUPER_ADMIN_EMAIL = 'roeliobinance@gmail.com';

/**
 * Checks whether an email qualifies for Super Admin privileges.
 * STRICT: Only roeliobinance@gmail.com has access.
 */
export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

/**
 * Fetch all registered users
 */
export async function fetchAllUsers(): Promise<UserProfile[]> {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      uid: d.id,
      ...d.data(),
    })) as UserProfile[];
  } catch (err) {
    // If permission or offline in demo mode, provide local mock users
    const localDemo = localStorage.getItem('linkup_demo_users');
    if (localDemo) {
      try {
        return JSON.parse(localDemo);
      } catch (e) {}
    }
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
}

/**
 * Verify or unverify a user with the official blue tick badge
 */
export async function setUserVerification(
  uid: string,
  isVerified: boolean
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isVerified,
      verifiedAt: isVerified ? serverTimestamp() : null,
      verificationRequested: false,
      verificationStatus: isVerified ? 'approved' : 'none',
    });
  } catch (err) {
    // Fallback for demo mode
    updateLocalDemoUser(uid, {
      isVerified,
      verifiedAt: isVerified ? new Date().toISOString() : null,
      verificationRequested: false,
      verificationStatus: isVerified ? 'approved' : 'none',
    });
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Submit a request to be a verified user with a blue tick badge
 */
export async function submitVerificationRequest(
  uid: string,
  reason: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      verificationRequested: true,
      verificationStatus: 'pending',
      verificationRequestDate: serverTimestamp(),
      verificationReason: reason.trim(),
    });
  } catch (err) {
    updateLocalDemoUser(uid, {
      verificationRequested: true,
      verificationStatus: 'pending',
      verificationReason: reason.trim(),
      verificationRequestDate: new Date().toISOString(),
    });
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Cancel a pending verification request
 */
export async function cancelVerificationRequest(
  uid: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      verificationRequested: false,
      verificationStatus: 'none',
      verificationReason: '',
    });
  } catch (err) {
    updateLocalDemoUser(uid, {
      verificationRequested: false,
      verificationStatus: 'none',
      verificationReason: '',
    });
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Ban or unban a user
 */
export async function setUserBanStatus(
  uid: string,
  isBanned: boolean,
  banReason?: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isBanned,
      banReason: isBanned ? (banReason || 'Violated community guidelines') : null,
      bannedAt: isBanned ? serverTimestamp() : null,
    });
  } catch (err) {
    // Fallback for demo mode
    updateLocalDemoUser(uid, {
      isBanned,
      banReason: isBanned ? (banReason || 'Violated community guidelines') : undefined,
      bannedAt: isBanned ? new Date().toISOString() : undefined,
    });
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Fetch all chats in the entire platform for admin oversight
 */
export async function fetchAllChats(): Promise<Chat[]> {
  try {
    const q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    const chats: Chat[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const participants = data.participants || [];
      let otherUser: UserProfile | undefined;

      // Fetch first other participant profile for display
      if (participants.length > 0) {
        try {
          const userDoc = await getDoc(doc(db, 'users', participants[0]));
          if (userDoc.exists()) {
            otherUser = userDoc.data() as UserProfile;
          }
        } catch (e) {}
      }

      chats.push({
        id: docSnap.id,
        ...data,
        otherUser,
      } as Chat);
    }

    return chats;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'chats');
    return [];
  }
}

/**
 * Fetch messages for a specific chat
 */
export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Message[];
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `chats/${chatId}/messages`);
    return [];
  }
}

/**
 * Delete a specific message inside any chat
 */
export async function deleteSingleMessage(
  chatId: string,
  messageId: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `chats/${chatId}/messages/${messageId}`);
  }
}

/**
 * Wipe all messages inside a specific chat
 */
export async function wipeAllMessagesInChat(chatId: string): Promise<void> {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const snapshot = await getDocs(messagesRef);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // Reset chat's lastMessage
    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: '[Messages cleared by Administrator]',
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `chats/${chatId}/messages`);
  }
}

/**
 * Delete an entire chat and its messages
 */
export async function deleteEntireChat(chatId: string): Promise<void> {
  try {
    // Delete all messages first
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const snapshot = await getDocs(messagesRef);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);

    // Delete chat document
    await deleteDoc(doc(db, 'chats', chatId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `chats/${chatId}`);
  }
}

/**
 * Global purge: Delete all chats and all messages across LinkUp
 */
export async function purgeAllChats(): Promise<number> {
  try {
    const snapshot = await getDocs(collection(db, 'chats'));
    let totalDeleted = 0;
    for (const chatDoc of snapshot.docs) {
      await deleteEntireChat(chatDoc.id);
      totalDeleted++;
    }
    return totalDeleted;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'chats');
    return 0;
  }
}

/**
 * Create a new System Broadcast Alert
 */
export async function createSystemAlert(
  title: string,
  message: string,
  type: SystemAlert['type'],
  createdBy: string
): Promise<string> {
  try {
    const alertId = `alert_${Date.now()}`;
    const alertData = {
      id: alertId,
      title: title.trim(),
      message: message.trim(),
      type,
      isActive: true,
      createdAt: serverTimestamp(),
      createdBy,
    };
    await setDoc(doc(db, 'systemAlerts', alertId), alertData);
    return alertId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'systemAlerts');
    return '';
  }
}

/**
 * Toggle an alert's active status
 */
export async function toggleSystemAlert(
  alertId: string,
  isActive: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'systemAlerts', alertId), {
      isActive,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `systemAlerts/${alertId}`);
  }
}

/**
 * Delete a system alert
 */
export async function deleteSystemAlert(alertId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'systemAlerts', alertId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `systemAlerts/${alertId}`);
  }
}

/**
 * Helper for updating demo user storage if in demo mode
 */
function updateLocalDemoUser(uid: string, updates: Partial<UserProfile>) {
  try {
    const raw = localStorage.getItem('linkup_demo_users');
    if (raw) {
      const users: UserProfile[] = JSON.parse(raw);
      const idx = users.findIndex((u) => u.uid === uid);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates };
        localStorage.setItem('linkup_demo_users', JSON.stringify(users));
      }
    }
  } catch (e) {}
}
