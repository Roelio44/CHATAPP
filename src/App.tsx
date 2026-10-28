/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebAppLayout } from './components/WebAppLayout';
import { WebEmptyCanvas } from './components/WebEmptyCanvas';
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
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Sync document title with unread count for authentic webapp experience
  useEffect(() => {
    if (unreadChatsCount > 0) {
      document.title = `(${unreadChatsCount}) LinkUp Messenger`;
    } else {
      document.title = 'LinkUp Messenger';
    }
  }, [unreadChatsCount]);

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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-10 h-10 rounded-full border-3 border-blue-600 border-t-transparent animate-spin" />
        <span className="mt-3 text-xs font-medium text-zinc-400">Loading LinkUp Messenger...</span>
      </div>
    );
  }

  // Not logged in -> Show Authentication Web Card
  if (!currentUser) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4 transition-colors">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden">
          <AuthScreen />
        </div>
      </div>
    );
  }

  // Logged in but profile incomplete -> Show Profile Setup Web Card
  if (needsProfileSetup || !userProfile) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4 transition-colors">
        <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xl overflow-hidden">
          <ProfileSetupScreen />
        </div>
      </div>
    );
  }

  // Sidebar content (Changes based on active tab or settings)
  const sidebarContent = (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {isSettingsOpen ? (
          <SettingsScreen
            currentProfile={userProfile}
            onBack={() => setIsSettingsOpen(false)}
          />
        ) : activeTab === 'chats' ? (
          <ChatsScreen
            currentProfile={userProfile}
            activeChatId={activeChat?.chatId}
            onSelectChat={(chatId, otherUser) =>
              setActiveChat({ chatId, otherUser })
            }
            onNavigateToSearch={() => {
              setActiveTab('search');
              setIsSettingsOpen(false);
            }}
          />
        ) : activeTab === 'friends' ? (
          <FriendsScreen
            currentProfile={userProfile}
            onOpenChatWithUser={handleOpenChatWithUser}
            onNavigateToSearch={() => {
              setActiveTab('search');
              setIsSettingsOpen(false);
            }}
          />
        ) : activeTab === 'search' ? (
          <SearchUsersScreen
            currentUser={userProfile}
            onOpenChatWithUser={handleOpenChatWithUser}
          />
        ) : (
          <ProfileScreen
            currentProfile={userProfile}
            onNavigateToSettings={() => setIsSettingsOpen(true)}
          />
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop md:) */}
      <div className="md:hidden shrink-0">
        <AndroidNavBar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setIsSettingsOpen(false);
          }}
          unreadChatsCount={unreadChatsCount}
          pendingRequestsCount={pendingRequestsCount}
        />
      </div>
    </div>
  );

  // Main Canvas Content (Either active chat room or web empty state)
  const mainContent = activeChat ? (
    <ChatRoomScreen
      chatId={activeChat.chatId}
      otherUser={activeChat.otherUser}
      currentUser={userProfile}
      onBack={() => setActiveChat(null)}
    />
  ) : (
    <WebEmptyCanvas
      onNavigateTab={(tab) => {
        setActiveTab(tab);
        setIsSettingsOpen(false);
      }}
    />
  );

  return (
    <WebAppLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setIsSettingsOpen(false);
      }}
      isSettingsOpen={isSettingsOpen}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onCloseSettings={() => setIsSettingsOpen(false)}
      userProfile={userProfile}
      unreadChatsCount={unreadChatsCount}
      pendingRequestsCount={pendingRequestsCount}
      activeChat={activeChat}
      sidebarContent={sidebarContent}
      mainContent={mainContent}
    />
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
