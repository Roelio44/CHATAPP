/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  Moon,
  Sun,
  Smartphone,
  Shield,
  Eye,
  CheckCheck,
  Bell,
  LogOut,
  Info,
  Check,
  ShieldCheck,
  Sparkles,
  Clock,
  Send,
  X,
  Loader2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { ThemePreference, UserProfile } from '../types';
import {
  requestNotificationPermission,
  sendWebNotification,
} from '../utils/notificationService';
import { VerifiedBadge } from './VerifiedBadge';
import {
  submitVerificationRequest,
  cancelVerificationRequest,
} from '../services/adminService';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsScreenProps {
  currentProfile: UserProfile;
  onBack: () => void;
  onNavigateToAdmin?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentProfile,
  onBack,
  onNavigateToAdmin,
}) => {
  const { theme, setTheme, isDark } = useTheme();
  const { logout, isAdmin } = useAuth();

  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [notifications, setNotifications] = useState(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission === 'granted'
      : false
  );

  // Verification request state
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationReason, setVerificationReason] = useState('');
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [localVerificationStatus, setLocalVerificationStatus] = useState<string>(
    currentProfile.verificationStatus || (currentProfile.verificationRequested ? 'pending' : 'none')
  );

  const { isInstallable, isInstalled, isStandalone, isIOS, installPWA } = usePWAInstall();

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationReason.trim() || isSubmittingVerification) return;

    setIsSubmittingVerification(true);
    try {
      await submitVerificationRequest(currentProfile.uid, verificationReason);
      setLocalVerificationStatus('pending');
      setVerificationFeedback({
        text: 'Verification request submitted! Administrators will review your profile.',
        type: 'success',
      });
      setIsVerificationModalOpen(false);
      setVerificationReason('');
    } catch (err: any) {
      setVerificationFeedback({
        text: 'Failed to submit verification request. Please try again.',
        type: 'error',
      });
    } finally {
      setIsSubmittingVerification(false);
      setTimeout(() => setVerificationFeedback(null), 5000);
    }
  };

  const handleCancelVerification = async () => {
    setIsSubmittingVerification(true);
    try {
      await cancelVerificationRequest(currentProfile.uid);
      setLocalVerificationStatus('none');
      setVerificationFeedback({
        text: 'Verification request cancelled.',
        type: 'success',
      });
    } catch (err: any) {
      setVerificationFeedback({
        text: 'Failed to cancel request.',
        type: 'error',
      });
    } finally {
      setIsSubmittingVerification(false);
      setTimeout(() => setVerificationFeedback(null), 4000);
    }
  };

  const themeOptions: { id: ThemePreference; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    {
      id: 'system',
      label: 'System Default',
      desc: 'Matches your Android device theme settings',
      icon: Smartphone,
    },
    {
      id: 'light',
      label: 'Light Mode',
      desc: 'Clean, crisp high-contrast light interface',
      icon: Sun,
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      desc: 'Deep dark palette optimized for OLED displays',
      icon: Moon,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors select-none">
      {/* Top Header (Safe Area & Phone Optimized) */}
      <div className="flex items-center gap-2 px-4 pt-[max(env(safe-area-inset-top,0px),0.75rem)] pb-3 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 z-20 app-chrome">
        <button
          onClick={onBack}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 -ml-1 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer touch-manipulation"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Admin Center (If Super Admin) */}
        {isAdmin && (
          <div className="p-4 rounded-2xl bg-gradient-to-tr from-amber-500/15 to-indigo-500/15 border border-amber-500/30">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  Super Admin Control Center
                </h3>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Authorized Administrator
                </span>
              </div>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              Verify users with blue tick badges, suspend/ban violators, broadcast live server alerts, audit conversation transcripts, and manage system message deletions.
            </p>
            {onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Launch Admin Control Center</span>
              </button>
            )}
          </div>
        )}



        {/* Theme Section */}
        <div>
          <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Appearance & Theme
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden shadow-xs">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;

              return (
                <div
                  key={opt.id}
                  onClick={() => setTheme(opt.id)}
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {opt.label}
                      </h4>
                      <p className="text-[11px] text-zinc-400">{opt.desc}</p>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-zinc-300 dark:border-zinc-700'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Privacy & Presence */}
        <div>
          <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Privacy & Activity
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden shadow-xs">
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Online Presence
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Show your active status to friends
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOnlineStatus(!showOnlineStatus)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  showOnlineStatus ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    showOnlineStatus ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <CheckCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Read Receipts
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Let contacts see when you read their messages
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReadReceipts(!readReceipts)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  readReceipts ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    readReceipts ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Push Notifications
                  </h4>
                  <p className="text-[11px] text-zinc-400">
                    Alerts for incoming calls and new messages
                  </p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const next = !notifications;
                  setNotifications(next);
                  if (next) {
                    const granted = await requestNotificationPermission();
                    if (granted) {
                      sendWebNotification('AlbaniaCHAT', {
                        body: 'Push notifications are active for incoming calls and messages!',
                      });
                    }
                  }
                }}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  notifications ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-xs ${
                    notifications ? 'left-5.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Verification Status Feedback Toast */}
        {verificationFeedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-xs ${
              verificationFeedback.type === 'success'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
            }`}
          >
            {verificationFeedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <Info className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{verificationFeedback.text}</span>
          </div>
        )}

        {/* Verification Request Section */}
        <div>
          <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <VerifiedBadge size="xs" />
            <span>Account Verification</span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 p-4 shadow-xs">
            {currentProfile.isVerified ? (
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                  <VerifiedBadge size="md" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    Verified Account
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                    Your profile has an official blue checkmark badge visible to all members in chats, calls, and search.
                  </p>
                </div>
              </div>
            ) : localVerificationStatus === 'pending' || currentProfile.verificationRequested ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      Verification Request Under Review
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Your request for a verified blue tick badge has been submitted and is currently being reviewed by AlbaniaCHAT administrators.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelVerification}
                  disabled={isSubmittingVerification}
                  className="w-full py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingVerification ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Cancel Pending Request</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      Request Verified User Badge
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Get an official blue checkmark badge next to your name to establish authentic identity, trust, and prominence across AlbaniaCHAT.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsVerificationModalOpen(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <VerifiedBadge size="xs" />
                  <span>Request Verification Badge</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Details */}
        <div>
          <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Account Info
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 p-4 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-400 shadow-xs">
            <div className="flex justify-between">
              <span className="font-medium text-zinc-400">Email</span>
              <span className="font-mono text-zinc-800 dark:text-zinc-200">
                {currentProfile.email || 'Google User'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-zinc-400">User ID</span>
              <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                @{currentProfile.userId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-zinc-400">Account UID</span>
              <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[150px]">
                {currentProfile.uid}
              </span>
            </div>
          </div>
        </div>

        {/* Phone Web App Installation Section */}
        <div>
          <div className="px-1 mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-500" />
            <span>Phone Web App</span>
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/60 p-4 shadow-xs space-y-3">
            {isStandalone ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Running in App Mode
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Installed on phone home screen with fullscreen mode and instant access.
                  </p>
                </div>
              </div>
            ) : isIOS ? (
              <div className="space-y-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Add to iPhone Home Screen
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Run AlbaniaCHAT like a native iOS phone app without the Safari address bar:
                    </p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                    <span>Tap the <strong>Share button (⎋)</strong> at the bottom of Safari.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen" ➕</strong>.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                    <span>Tap <strong>Add</strong>. Launch fullscreen from your phone!</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Install AlbaniaCHAT App
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Install as a standalone Progressive Web App for fast launch, background calls, and full-screen experience.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={installPWA}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Install to Phone Home Screen</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* About App */}
        <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-center">
          <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            AlbaniaCHAT
          </h4>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Version 2.0.0 • Modern Secure Edition
          </p>
        </div>

        {/* Logout */}
        <button
          onClick={() => {
            if (confirm('Log out from AlbaniaCHAT?')) {
              logout();
            }
          }}
          className="w-full py-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Account</span>
        </button>
      </div>

      {/* Verification Request Modal */}
      {isVerificationModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsVerificationModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <VerifiedBadge size="sm" />
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Request Verification Badge
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsVerificationModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVerification} className="mt-4 space-y-4">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                <span className="font-semibold block mb-0.5">Verification Criteria</span>
                Verified blue checkmark badges establish authentic presence for notable members, active community members, creators, or official representatives on AlbaniaCHAT.
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Why should your account be verified?
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={300}
                  placeholder="Describe your account, public profile, social links, or reason for requesting a verified badge..."
                  value={verificationReason}
                  onChange={(e) => setVerificationReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base sm:text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none transition-all"
                />
                <div className="text-right text-[10px] text-zinc-400 mt-1">
                  {verificationReason.length} / 300 characters
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVerificationModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!verificationReason.trim() || isSubmittingVerification}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingVerification ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
