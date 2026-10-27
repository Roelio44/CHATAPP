/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  needsProfileSetup: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  createUserProfile: (data: {
    fullName: string;
    userId: string;
    profileImage: string;
    bio?: string;
  }) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  checkUserIdAvailable: (candidateUserId: string) => Promise<boolean>;
  authError: string | null;
  setAuthError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Fetch or listen to user profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthError(null);
      if (user) {
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);
            setNeedsProfileSetup(false);
            // Mark online
            await updateDoc(userDocRef, {
              isOnline: true,
              lastSeen: serverTimestamp(),
            }).catch(() => {});
          } else {
            setUserProfile(null);
            setNeedsProfileSetup(true);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setNeedsProfileSetup(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Presence management: handle tab blur, close, visibility change
  useEffect(() => {
    if (!currentUser?.uid || needsProfileSetup) return;

    const uid = currentUser.uid;
    const userDocRef = doc(db, 'users', uid);

    const setPresence = async (isOnline: boolean) => {
      try {
        await updateDoc(userDocRef, {
          isOnline,
          lastSeen: serverTimestamp(),
        });
      } catch (e) {
        // Ignore during unload
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setPresence(false);
      } else {
        setPresence(true);
      }
    };

    const handleBeforeUnload = () => {
      setPresence(false);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser?.uid, needsProfileSetup]);

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-in failed', err);
      setAuthError(err.message || 'Google Sign-In failed');
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (err: any) {
      console.error('Email login failed', err);
      let msg = 'Failed to sign in. Please verify your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        msg = 'Incorrect email or password.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No user found with this email.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, fullName: string) => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      // Wait for auth state change to trigger profile setup screen
      setNeedsProfileSetup(true);
    } catch (err: any) {
      console.error('Email sign up failed', err);
      let msg = 'Sign up failed.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (e) {
        // proceed to sign out
      }
    }
    await signOut(auth);
    setUserProfile(null);
    setCurrentUser(null);
    setNeedsProfileSetup(false);
  };

  const checkUserIdAvailable = async (candidateUserId: string): Promise<boolean> => {
    const clean = candidateUserId.trim().replace(/^@/, '').toLowerCase();
    if (!clean || clean.length < 3) return false;
    try {
      const q = query(collection(db, 'users'), where('userId', '==', clean));
      const snap = await getDocs(q);
      // If no docs, or if the only doc is the current user's profile, it's available
      if (snap.empty) return true;
      if (snap.docs.length === 1 && snap.docs[0].id === currentUser?.uid) return true;
      return false;
    } catch (err) {
      console.error('Error checking user ID availability:', err);
      return false;
    }
  };

  const createUserProfile = async (data: {
    fullName: string;
    userId: string;
    profileImage: string;
    bio?: string;
  }) => {
    if (!currentUser) throw new Error('No authenticated user');
    const cleanUserId = data.userId.trim().replace(/^@/, '').toLowerCase();

    // Verify availability
    const isAvailable = await checkUserIdAvailable(cleanUserId);
    if (!isAvailable) {
      throw new Error(`User ID @${cleanUserId} is already taken. Please choose another.`);
    }

    const newProfile: UserProfile = {
      uid: currentUser.uid,
      fullName: data.fullName.trim(),
      email: currentUser.email || '',
      userId: cleanUserId,
      profileImage: data.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUserId}`,
      bio: data.bio?.trim() || '',
      isOnline: true,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'users', currentUser.uid), newProfile);
      setUserProfile(newProfile);
      setNeedsProfileSetup(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}`);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('No authenticated user');
    const userDocRef = doc(db, 'users', currentUser.uid);

    try {
      await updateDoc(userDocRef, {
        ...data,
      });
      setUserProfile((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        needsProfileSetup,
        loginWithGoogle,
        loginWithEmail,
        signUpWithEmail,
        logout,
        createUserProfile,
        updateUserProfile,
        checkUserIdAvailable,
        authError,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
