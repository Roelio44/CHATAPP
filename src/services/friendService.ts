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

/**
 * Fetch all registered users in Firestore + available demo/community profiles
 */
export async function getAllDiscoverableUsers(currentUserId: string): Promise<UserProfile[]> {
  const results: UserProfile[] = [];
  const seenIds = new Set<string>();

  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);

    snap.forEach((docSnap) => {
      if (docSnap.id !== currentUserId) {
        const u = { uid: docSnap.id, ...docSnap.data() } as UserProfile;
        results.push(u);
        seenIds.add(docSnap.id);
        if (u.userId) seenIds.add(u.userId.toLowerCase());
      }
    });
  } catch (err) {
    console.warn('Notice fetching users from Firestore in getAllDiscoverableUsers:', err);
  }

  // Always supplement with community demo users so users always have people to test & connect with
  try {
    const { DEMO_USERS } = await import('./demoService');
    for (const demoU of DEMO_USERS) {
      if (
        demoU.uid !== currentUserId &&
        !seenIds.has(demoU.uid) &&
        !seenIds.has(demoU.userId.toLowerCase())
      ) {
        results.push(demoU);
        seenIds.add(demoU.uid);
      }
    }
  } catch (e) {
    console.warn('Notice importing DEMO_USERS:', e);
  }

  return results;
}

/**
 * Search users by handle (@userId), full name, or email (case-insensitive substring match)
 */
export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
  const cleanTerm = searchTerm.trim().replace(/^@/, '').toLowerCase();
  const allUsers = await getAllDiscoverableUsers(currentUserId);

  if (!cleanTerm) {
    return allUsers.slice(0, 15);
  }

  return allUsers.filter((u) => {
    const uId = (u.userId || '').toLowerCase();
    const fName = (u.fullName || '').toLowerCase();
    const mail = (u.email || '').toLowerCase();
    const bioText = (u.bio || '').toLowerCase();
    return (
      uId.includes(cleanTerm) ||
      fName.includes(cleanTerm) ||
      mail.includes(cleanTerm) ||
      bioText.includes(cleanTerm)
    );
  });
}

/**
 * Get suggested users to display on the search screen when first opened
 */
export async function getSuggestedUsers(currentUserId: string): Promise<UserProfile[]> {
  const allUsers = await getAllDiscoverableUsers(currentUserId);
  return allUsers.slice(0, 12);
}

export type FriendshipStatus = 'none' | 'friends' | 'pending_sent' | 'pending_received';

/**
 * Bulk fetch friendship statuses for a list of target users
 * Efficiently uses at most 3 queries in total instead of 3 queries per user!
 */
export async function getFriendshipStatusesForUsers(
  currentUserId: string,
  targetUserIds: string[]
): Promise<Map<string, { status: FriendshipStatus; requestId?: string }>> {
  const statusMap = new Map<string, { status: FriendshipStatus; requestId?: string }>();
  if (!currentUserId || targetUserIds.length === 0) {
    return statusMap;
  }

  // Check demo mode
  if (currentUserId.startsWith('demo_')) {
    targetUserIds.forEach((id) => {
      statusMap.set(id, {
        status: id === 'demo_contact_1' ? 'friends' : 'none',
      });
    });
    return statusMap;
  }

  try {
    // 1. Fetch current user's friends
    const friendsRef = collection(db, 'friends');
    const friendsQ = query(friendsRef, where('uid', '==', currentUserId));
    const friendsSnap = await getDocs(friendsQ);
    const friendUidSet = new Set<string>();
    friendsSnap.forEach((d) => {
      const data = d.data();
      if (data.friendUid) friendUidSet.add(data.friendUid);
    });

    // 2. Fetch sent pending requests
    const reqRef = collection(db, 'friendRequests');
    const sentQ = query(
      reqRef,
      where('senderId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    const sentSnap = await getDocs(sentQ);
    const sentMap = new Map<string, string>(); // receiverId -> requestId
    sentSnap.forEach((d) => {
      const data = d.data();
      if (data.receiverId) sentMap.set(data.receiverId, d.id);
    });

    // 3. Fetch received pending requests
    const recvQ = query(
      reqRef,
      where('receiverId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    const recvSnap = await getDocs(recvQ);
    const recvMap = new Map<string, string>(); // senderId -> requestId
    recvSnap.forEach((d) => {
      const data = d.data();
      if (data.senderId) recvMap.set(data.senderId, d.id);
    });

    // Map each target user
    targetUserIds.forEach((tid) => {
      if (friendUidSet.has(tid)) {
        statusMap.set(tid, { status: 'friends' });
      } else if (sentMap.has(tid)) {
        statusMap.set(tid, { status: 'pending_sent', requestId: sentMap.get(tid) });
      } else if (recvMap.has(tid)) {
        statusMap.set(tid, { status: 'pending_received', requestId: recvMap.get(tid) });
      } else {
        statusMap.set(tid, { status: 'none' });
      }
    });
  } catch (err) {
    console.warn('Notice in getFriendshipStatusesForUsers:', err);
    targetUserIds.forEach((tid) => {
      if (!statusMap.has(tid)) {
        statusMap.set(tid, { status: 'none' });
      }
    });
  }

  return statusMap;
}

export async function checkFriendshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<{ status: FriendshipStatus; requestId?: string }> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { status: 'none' };
  }

  try {
    const statuses = await getFriendshipStatusesForUsers(currentUserId, [targetUserId]);
    return statuses.get(targetUserId) || { status: 'none' };
  } catch (err) {
    console.warn('Notice in checkFriendshipStatus:', err);
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
