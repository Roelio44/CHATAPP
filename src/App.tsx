/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AndroidShell } from './components/AndroidShell';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { ProfileSetupScreen } from './components/ProfileSetupScreen';
import { AndroidNavBar } from './components/AndroidNavBar';
import { ChatsScreen } from './components/ChatsScreen';
import { ChatRoomScreen } from './components/ChatRoomScreen';
import { FriendsScreen } from './components/FriendsScreen';
import { SearchUsersScreen } from './components/SearchUsersScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { MainTab, UserProfile } from './types';
import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  testFirestoreConnection,
} from './firebase/config';
import { getOrCreateChat } from './services/chatService';

function MainApp() {
  const { currentUser, userProfile, loading, needsProfileSetup } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>('chats');
  const [activeChat, setActiveChat] = useState<{
    chatId: string;
    otherUser: UserProfile;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Unread counts & pending requests badges
  const [unreadChatsCount, setUnreadChatsCount] = useState<number>(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  // Splash screen timer & connection test
  useEffect(() => {
    testFirestoreConnection();
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Listen to total unread count for badge
  useEffect(() => {
    if (!userProfile?.uid) return;

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', userProfile.uid));

    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const unreadForMe = data.unreadCount?.[userProfile.uid] || 0;
        if (unreadForMe > 0) {
          count += 1;
        }
      });
      setUnreadChatsCount(count);
    });

    return () => unsub();
  }, [userProfile?.uid]);

  // Listen to pending requests count for badge
  useEffect(() => {
    if (!userProfile?.uid) return;

    const reqRef = collection(db, 'friendRequests');
    const q = query(
      reqRef,
      where('receiverId', '==', userProfile.uid),
      where('status', '==', 'pending')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setPendingRequestsCount(snapshot.size);
    });

    return () => unsub();
  }, [userProfile?.uid]);

  // Open chat room with user
  const handleOpenChatWithUser = async (other: UserProfile) => {
    if (!userProfile?.uid) return;
    try {
      const chatId = await getOrCreateChat(userProfile.uid, other.uid);
      setActiveChat({ chatId, otherUser: other });
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  if (loading) {
    return (
      <AndroidShell>
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      </AndroidShell>
    );
  }

  // Not logged in -> Show Authentication Screen
  if (!currentUser) {
    return (
      <AndroidShell>
        <AuthScreen />
      </AndroidShell>
    );
  }

  // Logged in but profile incomplete -> Show Profile Setup Screen
  if (needsProfileSetup || !userProfile) {
    return (
      <AndroidShell>
        <ProfileSetupScreen />
      </AndroidShell>
    );
  }

  // Active chat room view
  if (activeChat) {
    return (
      <AndroidShell>
        <ChatRoomScreen
          chatId={activeChat.chatId}
          otherUser={activeChat.otherUser}
          currentUser={userProfile}
          onBack={() => setActiveChat(null)}
        />
      </AndroidShell>
    );
  }

  // Settings screen view
  if (isSettingsOpen) {
    return (
      <AndroidShell>
        <SettingsScreen
          currentProfile={userProfile}
          onBack={() => setIsSettingsOpen(false)}
        />
      </AndroidShell>
    );
  }

  // Main navigation tabs view
  return (
    <AndroidShell>
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {activeTab === 'chats' && (
          <ChatsScreen
            currentProfile={userProfile}
            onSelectChat={(chatId, otherUser) =>
              setActiveChat({ chatId, otherUser })
            }
            onNavigateToSearch={() => setActiveTab('search')}
          />
        )}

        {activeTab === 'friends' && (
          <FriendsScreen
            currentProfile={userProfile}
            onOpenChatWithUser={handleOpenChatWithUser}
            onNavigateToSearch={() => setActiveTab('search')}
          />
        )}

        {activeTab === 'search' && (
          <SearchUsersScreen
            currentUser={userProfile}
            onOpenChatWithUser={handleOpenChatWithUser}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileScreen
            currentProfile={userProfile}
            onNavigateToSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </div>

      <AndroidNavBar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveChat(null);
          setIsSettingsOpen(false);
        }}
        unreadChatsCount={unreadChatsCount}
        pendingRequestsCount={pendingRequestsCount}
      />
    </AndroidShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
