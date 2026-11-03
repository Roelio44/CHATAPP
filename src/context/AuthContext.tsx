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
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  updateProfile,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import { UserProfile } from '../types';
import { SUPER_ADMIN_EMAIL, isUserAdmin } from '../services/adminService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  needsProfileSetup: boolean;
  isAdmin: boolean;
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

  // Super Admin: ONLY roeliobinance@gmail.com has access
  const isAdmin = Boolean(
    currentUser?.email && currentUser.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
  );

  // Fetch or listen to user profile
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthError(null);
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      if (user) {
        setCurrentUser(user);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          profileUnsub = onSnapshot(
            userDocRef,
            (snap) => {
              if (snap.exists()) {
                const data = snap.data() as UserProfile;
                const isOwner = Boolean(user.email && user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase());
                if (isOwner) {
                  if (data.role !== 'admin' || !data.isVerified) {
                    data.role = 'admin';
                    data.isVerified = true;
                    updateDoc(userDocRef, { role: 'admin', isVerified: true }).catch(() => {});
                  }
                } else {
                  if (data.role === 'admin') {
                    data.role = 'user';
                    updateDoc(userDocRef, { role: 'user' }).catch(() => {});
                  }
                }
                setUserProfile(data);
                setNeedsProfileSetup(false);
              } else {
                // If the user logging in with Google is roeliobinance@gmail.com, auto-initialize their profile!
                if (user.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
                  const adminProfile: UserProfile = {
                    uid: user.uid,
                    fullName: user.displayName || 'Roelio',
                    email: user.email,
                    userId: 'roeliobinance',
                    profileImage: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=roeliobinance`,
                    bio: 'Super Administrator',
                    isOnline: true,
                    lastSeen: serverTimestamp(),
                    createdAt: serverTimestamp(),
                    isVerified: true,
                    role: 'admin',
                  };
                  setDoc(userDocRef, adminProfile).catch(() => {});
                  setUserProfile(adminProfile);
                  setNeedsProfileSetup(false);
                } else {
                  setUserProfile(null);
                  setNeedsProfileSetup(true);
                }
              }
              setLoading(false);
            },
            (err) => {
              console.error('Error listening to user profile:', err);
              handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
              setLoading(false);
            }
          );

          // Mark online
          await updateDoc(userDocRef, {
            isOnline: true,
            lastSeen: serverTimestamp(),
          }).catch(() => {});
        } catch (err) {
          console.error('Error fetching user profile:', err);
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setNeedsProfileSetup(false);
        setLoading(false);
      }
    });

    return () => {
      if (profileUnsub) profileUnsub();
      unsubscribe();
    };
  }, []);


  // Presence management: handle tab blur, close, visibility change
  useEffect(() => {
    if (!currentUser?.uid || needsProfileSetup || currentUser.uid.startsWith('demo_')) return;

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
      const code = err?.code || '';
      console.warn('Google sign-in status:', code, err?.message);

      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User closed or cancelled the popup dialog themselves
        return;
      }

      if (code === 'auth/popup-blocked') {
        setAuthError(
          'Your browser blocked the Google sign-in popup. Please allow popups for this page, or sign in using email and password below.'
        );
        return;
      }

      if (code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : 'albaniachat.netlify.app';
        setAuthError(
          `Domain "${host}" is not in Firebase Authorized Domains yet.\n\nTo enable Google login on Netlify, add "${host}" in Firebase Console > Authentication > Settings > Authorized Domains.\n\nYou can also sign in or create an account instantly with Email & Password below!`
        );
        return;
      }

      setAuthError(err?.message || 'Google sign-in could not be completed.');
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    const clean = email.trim().toLowerCase();
    try {
      await signInWithEmailAndPassword(auth, clean, pass);
    } catch (err: any) {
      const code = err?.code || '';
      console.warn('Email sign in error:', code);
      if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
        setAuthError('Incorrect email or password. If you do not have an account yet, click "Create one" below.');
      } else if (code === 'auth/wrong-password') {
        setAuthError('Incorrect password. Please verify and try again.');
      } else if (code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setAuthError('Too many failed attempts. Please wait a few moments before trying again.');
      } else {
        setAuthError(err?.message || 'Failed to sign in with email.');
      }
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, fullName: string) => {
    setAuthError(null);
    const clean = email.trim().toLowerCase();
    try {
      const cred = await createUserWithEmailAndPassword(auth, clean, pass);
      if (fullName.trim() && cred.user) {
        await updateProfile(cred.user, { displayName: fullName.trim() }).catch(() => {});
      }
      setNeedsProfileSetup(true);
    } catch (err: any) {
      const code = err?.code || '';
      console.warn('Email sign up error:', code);
      if (code === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists. Please sign in instead.');
      } else if (code === 'auth/weak-password') {
        setAuthError('Password is too weak. Please use at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else {
        setAuthError(err?.message || 'Failed to create account.');
      }
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem('linkup_demo_session');
    if (currentUser?.uid && !currentUser.uid.startsWith('demo_')) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          isOnline: false,
          lastSeen: serverTimestamp(),
        });
      } catch (e) {
        // proceed to sign out
      }
    }
    await signOut(auth).catch(() => {});
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

    if (currentUser.uid.startsWith('demo_')) {
      const updated = { ...userProfile, ...data } as UserProfile;
      setUserProfile(updated);
      try {
        const saved = JSON.parse(localStorage.getItem('linkup_demo_session') || '{}');
        saved.profile = updated;
        localStorage.setItem('linkup_demo_session', JSON.stringify(saved));
      } catch (e) {}
      return;
    }

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
        isAdmin,
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
