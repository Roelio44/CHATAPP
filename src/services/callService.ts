/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  deleteDoc,
} from '../firebase/config';
import { CallSession, CallType, UserProfile } from '../types';

/**
 * Initiates an outgoing call in Firestore
 */
export async function initiateCall(
  chatId: string,
  caller: UserProfile,
  receiver: UserProfile,
  type: CallType
): Promise<string> {
  const callId = `call_${chatId}`;
  const callRef = doc(db, 'calls', callId);

  const sessionData: CallSession = {
    callId,
    chatId,
    callerId: caller.uid,
    callerName: caller.fullName,
    callerImage: caller.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${caller.userId}`,
    callerUserId: caller.userId,
    receiverId: receiver.uid,
    type,
    status: 'calling',
    createdAt: serverTimestamp(),
  };

  await setDoc(callRef, sessionData);
  return callId;
}

/**
 * Listens to a specific call session (used by both caller and receiver during active call)
 */
export function listenToCallSession(
  callId: string,
  callback: (session: CallSession | null) => void
): () => void {
  const callRef = doc(db, 'calls', callId);

  return onSnapshot(
    callRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as CallSession);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Notice listening to call session:', err);
      callback(null);
    }
  );
}

/**
 * Listens for incoming calls targeted at the current user
 */
export function listenForIncomingCalls(
  currentUserId: string,
  callback: (session: CallSession | null) => void
): () => void {
  if (!currentUserId) return () => {};

  const callsRef = collection(db, 'calls');
  const q = query(
    callsRef,
    where('receiverId', '==', currentUserId),
    where('status', '==', 'calling')
  );

  return onSnapshot(
    q,
    (snap) => {
      if (!snap.empty) {
        const active = snap.docs[0].data() as CallSession;
        callback(active);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Notice listening for incoming calls:', err);
      callback(null);
    }
  );
}

/**
 * Receiver accepts the call
 */
export async function acceptCall(callId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'accepted',
    });
  } catch (err) {
    console.warn('Error accepting call:', err);
  }
}

/**
 * Receiver declines the call
 */
export async function declineCall(callId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'declined',
      endedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Error declining call:', err);
  }
}

/**
 * Either party ends the call
 */
export async function endCallSession(callId: string): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      status: 'ended',
      endedAt: serverTimestamp(),
    }).catch(() => {});

    // Clean up call doc after brief delay so both parties detect state transition
    setTimeout(async () => {
      await deleteDoc(callRef).catch(() => {});
    }, 2500);
  } catch (err) {
    console.warn('Error ending call session:', err);
  }
}
