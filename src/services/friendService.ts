/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import { UserProfile, FriendRequest, Friend } from '../types';

export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
  const cleanTerm = searchTerm.trim().replace(/^@/, '').toLowerCase();
  if (!cleanTerm) return [];

  try {
    // Search users by userId prefix or fetch recent users
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('userId', '>=', cleanTerm),
      where('userId', '<=', cleanTerm + '\uf8ff')
    );
    const snap = await getDocs(q);
    const results: UserProfile[] = [];

    snap.forEach((docSnap) => {
      if (docSnap.id !== currentUserId) {
        results.push(docSnap.data() as UserProfile);
      }
    });

    // If prefix matched few or none, fallback to broad search if cleanTerm is small
    if (results.length === 0) {
      const allUsersSnap = await getDocs(usersRef);
      allUsersSnap.forEach((docSnap) => {
        if (docSnap.id !== currentUserId) {
          const user = docSnap.data() as UserProfile;
          if (
            user.userId.toLowerCase().includes(cleanTerm) ||
            user.fullName.toLowerCase().includes(cleanTerm)
          ) {
            results.push(user);
          }
        }
      });
    }

    return results;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
    return [];
  }
}

export type FriendshipStatus = 'none' | 'friends' | 'pending_sent' | 'pending_received';

export async function checkFriendshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<{ status: FriendshipStatus; requestId?: string }> {
  try {
    // Check if friends
    const friendDocId = `${currentUserId}_${targetUserId}`;
    const friendSnap = await getDoc(doc(db, 'friends', friendDocId));
    if (friendSnap.exists()) {
      return { status: 'friends' };
    }

    // Check sent request
    const reqRef = collection(db, 'friendRequests');
    const sentQ = query(
      reqRef,
      where('senderId', '==', currentUserId),
      where('receiverId', '==', targetUserId),
      where('status', '==', 'pending')
    );
    const sentSnap = await getDocs(sentQ);
    if (!sentSnap.empty) {
      return { status: 'pending_sent', requestId: sentSnap.docs[0].id };
    }

    // Check received request
    const recvQ = query(
      reqRef,
      where('senderId', '==', targetUserId),
      where('receiverId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    const recvSnap = await getDocs(recvQ);
    if (!recvSnap.empty) {
      return { status: 'pending_received', requestId: recvSnap.docs[0].id };
    }

    return { status: 'none' };
  } catch (err) {
    console.error('Error checking friendship status:', err);
    return { status: 'none' };
  }
}

export async function sendFriendRequest(
  senderProfile: UserProfile,
  receiverProfile: UserProfile
): Promise<void> {
  const requestId = `${senderProfile.uid}_${receiverProfile.uid}`;
  const requestData: FriendRequest = {
    id: requestId,
    senderId: senderProfile.uid,
    receiverId: receiverProfile.uid,
    status: 'pending',
    senderName: senderProfile.fullName,
    senderUserId: senderProfile.userId,
    senderProfileImage: senderProfile.profileImage,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'friendRequests', requestId), requestData);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `friendRequests/${requestId}`);
  }
}

export async function acceptFriendRequest(
  request: FriendRequest,
  currentProfile: UserProfile
): Promise<void> {
  try {
    // 1. Update request status to accepted
    await updateDoc(doc(db, 'friendRequests', request.id), {
      status: 'accepted',
    });

    // 2. Fetch sender user profile to ensure fresh details
    const senderSnap = await getDoc(doc(db, 'users', request.senderId));
    const senderData = senderSnap.exists() ? (senderSnap.data() as UserProfile) : null;

    // 3. Create bidirectional friendship records
    const friendDoc1 = `${currentProfile.uid}_${request.senderId}`;
    const friendRecord1: Friend = {
      id: friendDoc1,
      uid: currentProfile.uid,
      friendUid: request.senderId,
      friendName: senderData ? senderData.fullName : request.senderName,
      friendUserId: senderData ? senderData.userId : request.senderUserId,
      friendProfileImage: senderData ? senderData.profileImage : request.senderProfileImage,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'friends', friendDoc1), friendRecord1);

    const friendDoc2 = `${request.senderId}_${currentProfile.uid}`;
    const friendRecord2: Friend = {
      id: friendDoc2,
      uid: request.senderId,
      friendUid: currentProfile.uid,
      friendName: currentProfile.fullName,
      friendUserId: currentProfile.userId,
      friendProfileImage: currentProfile.profileImage,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'friends', friendDoc2), friendRecord2);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'friends');
  }
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'friendRequests', requestId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `friendRequests/${requestId}`);
  }
}

export async function removeFriend(currentUserId: string, friendUid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'friends', `${currentUserId}_${friendUid}`));
    await deleteDoc(doc(db, 'friends', `${friendUid}_${currentUserId}`)).catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `friends/${currentUserId}_${friendUid}`);
  }
}
