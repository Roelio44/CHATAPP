/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';
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
import { AdminPanelScreen } from './components/AdminPanelScreen';
import { BannedScreen } from './components/BannedScreen';
import { IncomingCallModal } from './components/IncomingCallModal';
import { CallModal } from './components/CallModal';
import { MainTab, UserProfile, CallSession, CallType } from './types';
import {
  db,
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  testFirestoreConnection,
} from './firebase/config';
import { getOrCreateChat } from './services/chatService';
import {
  listenForIncomingCalls,
  acceptCall,
  declineCall,
  endCallSession,
} from './services/callService';
import {
  initServiceWorker,
  requestNotificationPermission,
  sendWebNotification,
  playMessageSound,
} from './utils/notificationService';

function MainApp() {
  const { currentUser, userProfile, loading, needsProfileSetup, isAdmin } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<MainTab>('chats');
  const [activeChat, setActiveChat] = useState<{
    chatId: string;
    otherUser: UserProfile;
  } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Incoming & Active received call state
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [activeReceivedCall, setActiveReceivedCall] = useState<{
    session: CallSession;
    otherUser: UserProfile;
  } | null>(null);

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
      document.title = `(${unreadChatsCount}) AlbaniaCHAT`;
    } else {
      document.title = 'AlbaniaCHAT';
    }
  }, [unreadChatsCount]);

  // Guard against non-admin navigating to admin tab
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('chats');
    }
  }, [activeTab, isAdmin]);

  // Initialize Service Worker for background notifications on mount
  useEffect(() => {
    initServiceWorker();
  }, []);

  // Listen for navigation events from Service Worker notification clicks
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_CHAT') {
        setActiveTab('chats');
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // Show intuitive permission prompt if notifications haven't been enabled yet
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        setShowPermissionPrompt(true);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowPermissionPrompt(false);
      sendWebNotification('AlbaniaCHAT Notifications Active', {
        body: 'You will now receive incoming messages and call alerts even when outside the app!',
      });
    }
  };

  // State refs for tracking incoming messages and preventing duplicate notification bursts
  const previousChatsStateRef = useRef<Record<string, { lastMessage?: string; lastSenderId?: string }>>({});
  const isInitialSnapshotDoneRef = useRef(false);
  const senderNamesCacheRef = useRef<Record<string, string>>({});

  // Global real-time listener for incoming messages across all chats (fires even when not in the chat)
  useEffect(() => {
    if (!userProfile?.uid) return;

    // Demo Mode incoming message handler
    if (userProfile.uid.startsWith('demo_')) {
      const updateDemoCount = () => {
        import('./services/demoService').then(({ getDemoChats }) => {
          const chats = getDemoChats();
          const unread = chats.filter((c) => (c.unreadCount?.[userProfile.uid] || 0) > 0).length;
          setUnreadChatsCount(unread);
        });
      };
      updateDemoCount();
      window.addEventListener('linkup_demo_chats_updated', updateDemoCount);

      const handleDemoMessage = (e: any) => {
        const msg = e.detail;
        if (msg && msg.senderId !== userProfile.uid) {
          const isActivelyInThisChat = activeChat?.chatId === msg.chatId && !document.hidden;
          if (!isActivelyInThisChat) {
            playMessageSound();
            sendWebNotification('New message on AlbaniaCHAT', {
              body: msg.text || (msg.imageUrl ? '📷 Photo' : msg.audioUrl ? '🎤 Voice note' : 'Sent an attachment'),
              tag: `demo_${msg.chatId}`,
              data: { chatId: msg.chatId },
            });
          }
        }
      };
      window.addEventListener('linkup_demo_msg_received', handleDemoMessage);

      return () => {
        window.removeEventListener('linkup_demo_chats_updated', updateDemoCount);
        window.removeEventListener('linkup_demo_msg_received', handleDemoMessage);
      };
    }

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', userProfile.uid));

    const unsub = onSnapshot(
      q,
      async (snapshot) => {
        let count = 0;

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const chatId = docSnap.id;
          const unreadForMe = data.unreadCount?.[userProfile.uid] || 0;
          if (unreadForMe > 0) {
            count += 1;
          }

          // Detect new incoming message from the other party
          if (isInitialSnapshotDoneRef.current) {
            const prev = previousChatsStateRef.current[chatId];
            const hasNewMessage =
              data.lastMessage &&
              data.lastSenderId &&
              data.lastSenderId !== userProfile.uid &&
              data.lastMessage !== prev?.lastMessage;

            if (hasNewMessage) {
              const isActivelyInThisChat = activeChat?.chatId === chatId && !document.hidden;

              if (!isActivelyInThisChat) {
                // Resolve sender's display name
                let senderName = senderNamesCacheRef.current[data.lastSenderId];
                if (!senderName) {
                  try {
                    const senderDoc = await getDoc(doc(db, 'users', data.lastSenderId));
                    if (senderDoc.exists()) {
                      senderName = senderDoc.data().fullName || senderDoc.data().userId || 'AlbaniaCHAT';
                      senderNamesCacheRef.current[data.lastSenderId] = senderName;
                    }
                  } catch (e) {
                    senderName = 'AlbaniaCHAT';
                  }
                }

                // Play audio chime
                playMessageSound();

                // Dispatch background push notification via Service Worker
                await sendWebNotification(senderName || 'AlbaniaCHAT', {
                  body: data.lastMessage,
                  tag: `chat_${chatId}`,
                  data: { chatId, url: '/' },
                });
              }
            }
          }

          // Cache latest state
          previousChatsStateRef.current[chatId] = {
            lastMessage: data.lastMessage,
            lastSenderId: data.lastSenderId,
          };
        }

        setUnreadChatsCount(count);
        isInitialSnapshotDoneRef.current = true;
      },
      (error) => {
        console.warn('Real-time chats notification listener warning:', error);
      }
    );

    return () => unsub();
  }, [userProfile?.uid, activeChat?.chatId]);

  // Listen to pending requests count for badge
  useEffect(() => {
    if (!userProfile?.uid) return;

    if (userProfile.uid.startsWith('demo_')) {
      setPendingRequestsCount(1);
      return;
    }

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

  // Request push notification permission when user profile is active
  useEffect(() => {
    if (userProfile?.uid) {
      requestNotificationPermission();
    }
  }, [userProfile?.uid]);

  // Real-time listener for incoming voice or video calls targeted at current user
  useEffect(() => {
    if (!userProfile?.uid) return;

    const unsub = listenForIncomingCalls(userProfile.uid, (session) => {
      setIncomingCall(session);

      if (session && session.status === 'calling') {
        sendWebNotification(`Incoming ${session.type === 'video' ? 'Video' : 'Voice'} Call`, {
          body: `${session.callerName} is calling you on AlbaniaCHAT...`,
          tag: session.callId,
          requireInteraction: true,
          vibrate: [500, 200, 500, 200, 500] as any,
          data: { callId: session.callId, url: '/' },
        });
      }
    });

    return () => unsub();
  }, [userProfile?.uid]);

  const handleAcceptIncomingCall = async () => {
    if (!incomingCall) return;
    await acceptCall(incomingCall.callId);
    const callerAsOther: UserProfile = {
      uid: incomingCall.callerId,
      fullName: incomingCall.callerName,
      email: '',
      userId: incomingCall.callerUserId || incomingCall.callerId.slice(0, 8),
      profileImage: incomingCall.callerImage,
      isOnline: true,
      lastSeen: new Date(),
      createdAt: new Date(),
    };
    setActiveReceivedCall({ session: incomingCall, otherUser: callerAsOther });
    setIncomingCall(null);
  };

  const handleDeclineIncomingCall = async () => {
    if (!incomingCall) return;
    await declineCall(incomingCall.callId);
    setIncomingCall(null);
  };

  const handleEndReceivedCall = async () => {
    if (activeReceivedCall) {
      await endCallSession(activeReceivedCall.session.callId);
      setActiveReceivedCall(null);
    }
  };

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
        <span className="mt-3 text-xs font-medium text-zinc-400">Loading AlbaniaCHAT...</span>
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

  // Banned / Suspended account -> Show Banned Screen
  if (userProfile.isBanned) {
    return <BannedScreen userProfile={userProfile} />;
  }

  // Sidebar content (Changes based on active tab or settings)
  const sidebarContent = (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {isSettingsOpen ? (
          <SettingsScreen
            currentProfile={userProfile}
            onBack={() => setIsSettingsOpen(false)}
            onNavigateToAdmin={() => {
              setIsSettingsOpen(false);
              setActiveTab('admin');
            }}
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

  // Main Canvas Content (Either active chat room, admin panel, or web empty state)
  const mainContent = activeTab === 'admin' && isAdmin ? (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <AdminPanelScreen
        currentProfile={userProfile}
        onClose={() => setActiveTab('chats')}
      />
      {/* Mobile Bottom Bar when in Admin Tab */}
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
  ) : activeChat ? (
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
    <>
      {/* Push Notification Opt-in Prompt Banner */}
      {showPermissionPrompt && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white px-4 pt-[max(env(safe-area-inset-top,0px),0.5rem)] pb-2.5 text-xs flex items-center justify-between shadow-md z-40 shrink-0 select-none app-chrome">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
              <Bell className="w-4 h-4 text-amber-300 animate-bounce" />
            </div>
            <div className="min-w-0">
              <span className="font-bold block">Enable Push Notifications</span>
              <span className="text-blue-100 text-[11px] truncate block">
                Receive incoming calls and message alerts when AlbaniaCHAT is in background or phone is locked.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="px-3.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-xl text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Turn On
            </button>
            <button
              type="button"
              onClick={() => setShowPermissionPrompt(false)}
              className="p-1 hover:bg-white/20 rounded-lg text-white/80 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

      {/* Global Real-Time Incoming Call Modal (Accept / Decline) */}
      {incomingCall && (
        <IncomingCallModal
          session={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* Connected Received Call Modal */}
      {activeReceivedCall && (
        <CallModal
          chatId={activeReceivedCall.session.chatId}
          callType={activeReceivedCall.session.type}
          currentUser={userProfile}
          otherUser={activeReceivedCall.otherUser}
          isInitiator={false}
          initialCallId={activeReceivedCall.session.callId}
          onEndCall={handleEndReceivedCall}
        />
      )}
    </>
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
