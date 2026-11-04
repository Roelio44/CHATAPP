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
  addDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  deleteDoc,
} from '../firebase/config';
import { CallSession, CallType, UserProfile } from '../types';

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

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
 * Saves WebRTC Offer to the call document
 */
export async function saveCallOffer(
  callId: string,
  offer: RTCSessionDescriptionInit
): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      offer: {
        sdp: offer.sdp,
        type: offer.type,
      },
    });
  } catch (err) {
    console.warn('Error saving call offer:', err);
  }
}

/**
 * Saves WebRTC Answer to the call document
 */
export async function saveCallAnswer(
  callId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  try {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, {
      answer: {
        sdp: answer.sdp,
        type: answer.type,
      },
      status: 'accepted',
    });
  } catch (err) {
    console.warn('Error saving call answer:', err);
  }
}

/**
 * Sends an ICE Candidate to the subcollection for the peer
 */
export async function addIceCandidate(
  callId: string,
  role: 'caller' | 'callee',
  candidate: RTCIceCandidate
): Promise<void> {
  try {
    const subcollectionName = role === 'caller' ? 'callerCandidates' : 'calleeCandidates';
    const candidatesCol = collection(db, 'calls', callId, subcollectionName);
    await addDoc(candidatesCol, candidate.toJSON());
  } catch (err) {
    console.warn('Error adding ICE candidate:', err);
  }
}

/**
 * Listens for ICE candidates sent by the peer
 */
export function listenToIceCandidates(
  callId: string,
  peerRole: 'caller' | 'callee',
  onCandidate: (candidate: RTCIceCandidateInit) => void
): () => void {
  const subcollectionName = peerRole === 'caller' ? 'callerCandidates' : 'calleeCandidates';
  const candidatesCol = collection(db, 'calls', callId, subcollectionName);

  return onSnapshot(
    candidatesCol,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          onCandidate(change.doc.data() as RTCIceCandidateInit);
        }
      });
    },
    (err) => {
      console.warn('Notice listening to ICE candidates:', err);
    }
  );
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
