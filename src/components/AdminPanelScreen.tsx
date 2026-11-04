/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  MessageSquare,
  Megaphone,
  Search,
  CheckCircle2,
  XCircle,
  Ban,
  UserCheck,
  AlertTriangle,
  Trash2,
  Eye,
  RefreshCw,
  Plus,
  Send,
  Lock,
  ArrowLeft,
  Info,
  Clock,
  Sparkles,
  AlertCircle,
  Check,
} from 'lucide-react';
import { UserProfile, Chat, Message, SystemAlert } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import {
  SUPER_ADMIN_EMAIL,
  fetchAllUsers,
  setUserVerification,
  setUserBanStatus,
  fetchAllChats,
  fetchChatMessages,
  deleteSingleMessage,
  wipeAllMessagesInChat,
  deleteEntireChat,
  purgeAllChats,
  createSystemAlert,
  toggleSystemAlert,
  deleteSystemAlert,
  cancelVerificationRequest,
} from '../services/adminService';
import { db, collection, query, orderBy, onSnapshot } from '../firebase/config';

interface AdminPanelScreenProps {
  currentProfile: UserProfile;
  onClose?: () => void;
}

type AdminTab = 'users' | 'broadcasts' | 'chats';

export const AdminPanelScreen: React.FC<AdminPanelScreenProps> = ({
  currentProfile,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'verified' | 'banned' | 'requests'>('all');

  // Feedback notifications
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Ban modal state
  const [banModalUser, setBanModalUser] = useState<UserProfile | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('Violated community guidelines and terms of service.');

  // Chat Inspect Modal state
  const [inspectChat, setInspectChat] = useState<Chat | null>(null);
  const [inspectMessages, setInspectMessages] = useState<Message[]>([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Global Purge confirmation modal
  const [showGlobalPurgeModal, setShowGlobalPurgeModal] = useState(false);
  const [purgeInputText, setPurgeInputText] = useState('');

  // New alert form state
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertMessage, setNewAlertMessage] = useState('');
  const [newAlertType, setNewAlertType] = useState<SystemAlert['type']>('announcement');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Notify feedback
  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Load all users
  const loadUsers = async () => {
    setLoading(true);
    try {
      const all = await fetchAllUsers();
      setUsers(all);
    } catch (e) {
      console.error('Failed to load users for admin:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load all chats
  const loadChats = async () => {
    try {
      const allChats = await fetchAllChats();
      setChats(allChats);
    } catch (e) {
      console.error('Failed to load chats for admin:', e);
    }
  };

  // Listen to alerts in real-time
  useEffect(() => {
    loadUsers();
    loadChats();

    const q = query(collection(db, 'systemAlerts'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const loaded: SystemAlert[] = [];
        snapshot.forEach((d) => loaded.push({ id: d.id, ...d.data() } as SystemAlert));
        setAlerts(loaded);
      },
      () => {
        // Fallback
      }
    );

    return () => unsub();
  }, []);

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.fullName.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.userId.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase());

    if (!matchesQuery) return false;
    if (userFilter === 'verified') return u.isVerified === true;
    if (userFilter === 'banned') return u.isBanned === true;
    if (userFilter === 'requests') return (u.verificationRequested === true || u.verificationStatus === 'pending');
    return true;
  });

  // Verify Toggle
  const handleToggleVerify = async (user: UserProfile) => {
    const nextState = !user.isVerified;
    try {
      await setUserVerification(user.uid, nextState);
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid ? { ...u, isVerified: nextState } : u))
      );
      notify(
        nextState
          ? `Verified @${user.userId}! Blue checkmark badge granted.`
          : `Removed verified badge from @${user.userId}.`
      );
    } catch (err: any) {
      notify('Failed to update verification status', 'error');
    }
  };

  // Ban/Unban handlers
  const handleOpenBanModal = (user: UserProfile) => {
    setBanModalUser(user);
    setBanReasonInput('Violated community guidelines and terms of service.');
  };

  const handleConfirmBan = async () => {
    if (!banModalUser) return;
    try {
      await setUserBanStatus(banModalUser.uid, true, banReasonInput);
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === banModalUser.uid
            ? { ...u, isBanned: true, banReason: banReasonInput }
            : u
        )
      );
      notify(`Account @${banModalUser.userId} has been suspended/banned.`);
      setBanModalUser(null);
    } catch (err: any) {
      notify('Failed to ban user', 'error');
    }
  };

  const handleUnban = async (user: UserProfile) => {
    try {
      await setUserBanStatus(user.uid, false);
      setUsers((prev) =>
        prev.map((u) =>
          u.uid === user.uid ? { ...u, isBanned: false, banReason: undefined } : u
        )
      );
      notify(`Account @${user.userId} has been unbanned.`);
    } catch (err: any) {
      notify('Failed to unban user', 'error');
    }
  };

  // Chat Inspect
  const handleInspectChat = async (chat: Chat) => {
    setInspectChat(chat);
    setInspectLoading(true);
    try {
      const msgs = await fetchChatMessages(chat.id);
      setInspectMessages(msgs);
    } catch (e) {
      notify('Failed to load chat messages', 'error');
    } finally {
      setInspectLoading(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!inspectChat) return;
    try {
      await deleteSingleMessage(inspectChat.id, msgId);
      setInspectMessages((prev) => prev.filter((m) => m.id !== msgId));
      notify('Message removed.');
    } catch (e) {
      notify('Failed to delete message', 'error');
    }
  };

  const handleWipeChatMessages = async (chatId: string) => {
    if (!window.confirm('Are you sure you want to delete ALL messages in this chat conversation?')) {
      return;
    }
    try {
      await wipeAllMessagesInChat(chatId);
      if (inspectChat?.id === chatId) {
        setInspectMessages([]);
      }
      notify('All messages in this chat conversation have been wiped.');
      loadChats();
    } catch (e) {
      notify('Failed to wipe messages', 'error');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!window.confirm('Permanently delete this entire conversation and all its messages?')) {
      return;
    }
    try {
      await deleteEntireChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (inspectChat?.id === chatId) {
        setInspectChat(null);
      }
      notify('Conversation deleted from database.');
    } catch (e) {
      notify('Failed to delete chat', 'error');
    }
  };

  // Global Purge
  const handleGlobalPurge = async () => {
    if (purgeInputText !== 'DELETE ALL') {
      notify('You must type "DELETE ALL" to confirm platform-wide purge', 'error');
      return;
    }
    try {
      const count = await purgeAllChats();
      setChats([]);
      setInspectChat(null);
      setShowGlobalPurgeModal(false);
      setPurgeInputText('');
      notify(`Platform purge complete: ${count} chats deleted.`);
    } catch (e) {
      notify('Failed to execute platform chat purge', 'error');
    }
  };

  // Broadcast Alert
  const handleBroadcastAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertTitle.trim() || !newAlertMessage.trim()) {
      notify('Please enter both title and message body', 'error');
      return;
    }

    setIsBroadcasting(true);
    try {
      await createSystemAlert(
        newAlertTitle,
        newAlertMessage,
        newAlertType,
        currentProfile.email || SUPER_ADMIN_EMAIL
      );
      setNewAlertTitle('');
      setNewAlertMessage('');
      notify('Server alert broadcasted to all users successfully!');
    } catch (err: any) {
      notify('Failed to broadcast alert', 'error');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleToggleAlertStatus = async (alert: SystemAlert) => {
    try {
      await toggleSystemAlert(alert.id, !alert.isActive);
      notify(alert.isActive ? 'Alert paused/hidden.' : 'Alert activated live!');
    } catch (e) {
      notify('Failed to toggle alert', 'error');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteSystemAlert(alertId);
      notify('Alert deleted.');
    } catch (e) {
      notify('Failed to delete alert', 'error');
    }
  };

  // Stats calculation
  const totalVerified = users.filter((u) => u.isVerified).length;
  const totalBanned = users.filter((u) => u.isBanned).length;
  const totalRequests = users.filter((u) => u.verificationRequested || u.verificationStatus === 'pending').length;
  const activeAlertsCount = alerts.filter((a) => a.isActive).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden select-none">
      {/* ======================================================== */}
      {/* ADMIN HEADER BAR                                         */}
      {/* ======================================================== */}
      <header className="px-5 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer mr-1"
              title="Return to App"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Admin Control Center
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Authenticated Root: <span className="font-medium text-blue-600 dark:text-blue-400">{currentProfile.email || SUPER_ADMIN_EMAIL}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadUsers();
              loadChats();
              notify('Data refreshed.');
            }}
            className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Refresh All Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md animate-in fade-in duration-200 z-30 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500 text-white'
              : 'bg-rose-500 text-white'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="px-5 py-3 bg-zinc-100/70 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Total Users</span>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
            {users.length}
            <Users className="w-4 h-4 text-blue-500 opacity-60" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Verified Badges</span>
          <div className="text-lg font-bold text-sky-600 dark:text-sky-400 flex items-center justify-between">
            {totalVerified}
            <VerifiedBadge size="sm" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Banned Users</span>
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center justify-between">
            {totalBanned}
            <Ban className="w-4 h-4 text-rose-500 opacity-60" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Active Broadcasts</span>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between">
            {activeAlertsCount}
            <Megaphone className="w-4 h-4 text-amber-500 opacity-60" />
          </div>
        </div>
      </div>

      {/* Segmented Control Tabs */}
      <div className="px-5 pt-3 pb-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex gap-2 shrink-0">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Moderation & Blue Ticks</span>
          <span className="ml-1 text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/20">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'broadcasts'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Server Messages & Alerts</span>
          {activeAlertsCount > 0 && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold">
              {activeAlertsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('chats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'chats'
              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat Audits & Purge</span>
          <span className="ml-1 text-[10px] opacity-80 px-1.5 py-0.2 rounded-full bg-black/20">
            {chats.length}
          </span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MAIN TAB CONTENT AREA                                    */}
      {/* ======================================================== */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* -------------------------------------------------------- */}
        {/* TAB 1: USERS & BLUE TICK VERIFICATION & BANNING          */}
        {/* -------------------------------------------------------- */}
        {activeTab === 'users' && (
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search user by name, @handle or email..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500 shadow-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setUserFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    userFilter === 'all'
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  All ({users.length})
                </button>
                <button
                  onClick={() => setUserFilter('verified')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    userFilter === 'verified'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <VerifiedBadge size="xs" />
                  Verified ({totalVerified})
                </button>
                <button
                  onClick={() => setUserFilter('banned')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    userFilter === 'banned'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <Ban className="w-3.5 h-3.5" />
                  Banned ({totalBanned})
                </button>
                <button
                  onClick={() => setUserFilter('requests')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 ${
                    userFilter === 'requests'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white dark:bg-zinc-900 text-amber-600 dark:text-amber-400 border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Requests ({totalRequests})
                </button>
              </div>
            </div>

            {/* Users List */}
            {filteredUsers.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <Users className="w-10 h-10 text-zinc-400 mx-auto mb-2 opacity-50" />
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">No users found</h3>
                <p className="text-xs text-zinc-400 mt-1">Try adjusting your search or filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredUsers.map((user) => {
                  const isVerified = user.isVerified === true;
                  const isBanned = user.isBanned === true;
                  const isSelf = user.email?.toLowerCase() === currentProfile.email?.toLowerCase();
                  const hasPendingRequest = user.verificationRequested === true || user.verificationStatus === 'pending';

                  return (
                    <div
                      key={user.uid}
                      className={`p-4 rounded-2xl bg-white dark:bg-zinc-900 border transition-all shadow-xs flex flex-col justify-between ${
                        isBanned
                          ? 'border-rose-300 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10'
                          : hasPendingRequest
                          ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/10 dark:bg-amber-950/10'
                          : isVerified
                          ? 'border-sky-300/80 dark:border-sky-900/40'
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                    >
                      {/* Top: Avatar & Info */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={
                              user.profileImage ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${user.userId}`
                            }
                            alt={user.fullName}
                            className="w-12 h-12 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700 shadow-xs"
                          />
                          {user.isOnline ? (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
                          ) : (
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-400 border-2 border-white dark:border-zinc-900" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {user.fullName}
                            </span>
                            {isVerified && <VerifiedBadge size="sm" />}
                            {hasPendingRequest && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                <span>Request Pending</span>
                              </span>
                            )}
                            {isBanned && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                                Banned
                              </span>
                            )}
                            {isSelf && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                You
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            @{user.userId}
                          </div>

                          <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {user.email || 'No email registered'}
                          </div>

                          {/* Verification Request Reason Callout */}
                          {hasPendingRequest && (
                            <div className="mt-2 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 p-2.5 rounded-xl">
                              <span className="font-semibold text-[10px] block text-amber-700 dark:text-amber-300 uppercase tracking-wider mb-0.5">
                                Verification Note:
                              </span>
                              <p className="italic text-[11px] text-zinc-700 dark:text-zinc-300 leading-relaxed mb-2">
                                "{user.verificationReason || 'No details specified'}"
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleToggleVerify(user)}
                                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve & Verify</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await cancelVerificationRequest(user.uid);
                                      setUsers((prev) =>
                                        prev.map((u) =>
                                          u.uid === user.uid
                                            ? { ...u, verificationRequested: false, verificationStatus: 'rejected' }
                                            : u
                                        )
                                      );
                                      notify(`Declined verification request for @${user.userId}`);
                                    } catch (e) {
                                      notify('Failed to decline request', 'error');
                                    }
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium cursor-pointer"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          )}

                          {isBanned && user.banReason && (
                            <div className="mt-2 text-[11px] text-rose-500 font-medium bg-rose-500/10 px-2 py-1 rounded-md">
                              Reason: {user.banReason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Actions: Verify & Ban */}
                      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                        {/* Verify Button */}
                        <button
                          onClick={() => handleToggleVerify(user)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isVerified
                              ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-zinc-600 dark:text-zinc-300 hover:text-rose-600 dark:hover:text-rose-400 border border-zinc-200 dark:border-zinc-700'
                              : 'bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                          }`}
                        >
                          <VerifiedBadge size="xs" />
                          <span>{isVerified ? 'Remove Blue Tick' : 'Give Blue Tick'}</span>
                        </button>

                        {/* Ban / Unban Button */}
                        {!isSelf && (
                          <button
                            onClick={() => (isBanned ? handleUnban(user) : handleOpenBanModal(user))}
                            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                              isBanned
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            {isBanned ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Unban User</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                <span>Ban User</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* TAB 2: SERVER BROADCASTS & ALERTS                        */}
        {/* -------------------------------------------------------- */}
        {activeTab === 'broadcasts' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Create Broadcast Alert Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Send Platform Server Alert / Broadcast
                  </h2>
                  <p className="text-xs text-zinc-400">
                    This message will instantly appear in real time at the top of the screen for all online users.
                  </p>
                </div>
              </div>

              <form onSubmit={handleBroadcastAlert} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Alert Title / Header
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Server Maintenance, Welcome New Users, Security Update..."
                    value={newAlertTitle}
                    onChange={(e) => setNewAlertTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500"
                    maxLength={100}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Broadcast Message Content
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide full alert details for all platform users..."
                    value={newAlertMessage}
                    onChange={(e) => setNewAlertMessage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500 resize-none"
                    maxLength={1000}
                    required
                  />
                </div>

                {/* Alert Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Severity / Visual Style
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['announcement', 'warning', 'urgent', 'info'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewAlertType(type)}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          newAlertType === type
                            ? type === 'urgent'
                              ? 'bg-rose-500 text-white border-rose-600'
                              : type === 'warning'
                              ? 'bg-amber-500 text-white border-amber-600'
                              : type === 'announcement'
                              ? 'bg-blue-600 text-white border-blue-700'
                              : 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isBroadcasting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast to All Users'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* List of Active and Past Alerts */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Active & Previous Broadcasts ({alerts.length})
              </h3>

              {alerts.length === 0 ? (
                <div className="text-center py-10 text-zinc-400 text-xs">
                  No alerts have been broadcasted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        alert.isActive
                          ? 'border-blue-300 dark:border-blue-900/50 bg-blue-50/10 dark:bg-blue-950/10'
                          : 'border-zinc-200 dark:border-zinc-800 opacity-60'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              alert.type === 'urgent'
                                ? 'bg-rose-500 text-white'
                                : alert.type === 'warning'
                                ? 'bg-amber-500 text-white'
                                : alert.type === 'announcement'
                                ? 'bg-blue-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {alert.type}
                          </span>
                          <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                            {alert.title}
                          </span>
                          {alert.isActive ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                              Live
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-500 text-[10px] font-semibold">
                              Paused
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                          {alert.message}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleAlertStatus(alert)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            alert.isActive
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
                          }`}
                        >
                          {alert.isActive ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Delete Alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* -------------------------------------------------------- */}
        {/* TAB 3: CHAT AUDIT & GLOBAL PURGE                         */}
        {/* -------------------------------------------------------- */}
        {activeTab === 'chats' && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Danger Zone: Global Purge */}
            <div className="p-5 rounded-3xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Platform Data Purge: Delete All Chats & Messages</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xl">
                  As requested, this administrator override allows you to wipe all conversation threads and message logs platform-wide across the entire database.
                </p>
              </div>

              <button
                onClick={() => setShowGlobalPurgeModal(true)}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete All Chats Message</span>
              </button>
            </div>

            {/* Platform Chats List */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Live Platform Conversations ({chats.length})
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Audit message transcripts or clear individual user chat histories.
                  </p>
                </div>
              </div>

              {chats.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  No active chats currently recorded in the database.
                </div>
              ) : (
                <div className="space-y-3">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-900/40 bg-zinc-50/50 dark:bg-zinc-950/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                              Chat ID: {chat.id.slice(0, 16)}...
                            </span>
                            <span className="text-[10px] text-zinc-400 bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.2 rounded-md">
                              {chat.participants.length} users
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            Last message: <span className="font-medium text-zinc-700 dark:text-zinc-300">{chat.lastMessage || 'No messages yet'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleInspectChat(chat)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Messages</span>
                        </button>

                        <button
                          onClick={() => handleWipeChatMessages(chat.id)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Wipe messages only"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Clear Msgs</span>
                        </button>

                        <button
                          onClick={() => handleDeleteChat(chat.id)}
                          className="p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Delete Entire Chat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: BAN USER REASON PROMPT                         */}
      {/* ======================================================== */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Suspend User Account
                </h3>
                <p className="text-xs text-zinc-400">
                  Target: @{banModalUser.userId} ({banModalUser.fullName})
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-4 leading-relaxed">
              Banning this user will immediately revoke their ability to open the app, send messages, or send friend requests.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Reason for suspension (displayed to user upon login)
              </label>
              <textarea
                rows={3}
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setBanModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBan}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                <span>Confirm Ban</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: INSPECT CHAT MESSAGES                           */}
      {/* ======================================================== */}
      {inspectChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl h-[85vh] bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    Chat Message Transcript & Audit
                  </h3>
                  <p className="text-xs text-zinc-400">
                    ID: {inspectChat.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleWipeChatMessages(inspectChat.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs font-medium cursor-pointer"
                  title="Wipe all messages in this conversation"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setInspectChat(null)}
                  className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {inspectLoading ? (
                <div className="h-full flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : inspectMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-xs">
                  <MessageSquare className="w-8 h-8 opacity-40 mb-2" />
                  <span>No messages in this chat room.</span>
                </div>
              ) : (
                inspectMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          Sender ID: {msg.senderId.slice(0, 10)}...
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed break-words whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 opacity-60 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                      title="Delete single message"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center shrink-0 text-xs text-zinc-400">
              <span>Total Messages: {inspectMessages.length}</span>
              <button
                onClick={() => setInspectChat(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: GLOBAL PURGE CONFIRMATION                       */}
      {/* ======================================================== */}
      {showGlobalPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-rose-300 dark:border-rose-900/60 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Global Platform Chat Purge
                </h3>
                <p className="text-xs text-rose-500 font-semibold">
                  Extreme Administrative Action
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-4 leading-relaxed">
              This action will permanently delete <span className="font-bold text-rose-600 dark:text-rose-400">EVERY conversation and message</span> from the database across all users. This cannot be undone.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Type <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">DELETE ALL</span> to confirm:
              </label>
              <input
                type="text"
                value={purgeInputText}
                onChange={(e) => setPurgeInputText(e.target.value)}
                placeholder="DELETE ALL"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-rose-300 dark:border-rose-900 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setShowGlobalPurgeModal(false);
                  setPurgeInputText('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGlobalPurge}
                disabled={purgeInputText !== 'DELETE ALL'}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/25 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Confirm Purge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
