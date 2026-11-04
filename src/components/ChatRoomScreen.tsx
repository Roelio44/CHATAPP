/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Send,
  Check,
  CheckCheck,
  Reply,
  X,
  Smile,
  MoreVertical,
  Paperclip,
  Phone,
  Video,
  Image as ImageIcon,
  ZoomIn,
  Download,
  Loader2,
  Mic,
  Lock,
  EyeOff,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  db,
  collection,
  query,
  orderBy,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import { Message, UserProfile } from '../types';
import {
  sendMessage,
  markMessagesAsSeen,
  markViewOnceAsOpened,
  deleteMessage,
  toggleMessageReaction,
} from '../services/chatService';
import { formatMessageTime, formatLastSeen } from '../utils/formatTime';
import { VerifiedBadge } from './VerifiedBadge';
import { CallModal, CallType } from './CallModal';
import { compressImageFile } from '../utils/imageCompressor';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import { VoiceRecorderBar } from './VoiceRecorderBar';
import { ViewOncePhotoModal } from './ViewOncePhotoModal';
import { ComprehensiveEmojiPicker } from './ComprehensiveEmojiPicker';

interface ChatRoomScreenProps {
  chatId: string;
  otherUser: UserProfile;
  currentUser: UserProfile;
  onBack: () => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😊', '🎉', '👋'];

export const ChatRoomScreen: React.FC<ChatRoomScreenProps> = ({
  chatId,
  otherUser,
  currentUser,
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isViewOnceActive, setIsViewOnceActive] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [activeViewOnceMsg, setActiveViewOnceMsg] = useState<Message | null>(null);
  const [viewingPhotoUrl, setViewingPhotoUrl] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeCall, setActiveCall] = useState<CallType | null>(null);
  const [activeReactionMenuMsgId, setActiveReactionMenuMsgId] = useState<string | null>(null);
  const [pickerForReactionMsgId, setPickerForReactionMsgId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const lastCallSummaryTimeRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time messages listener
  useEffect(() => {
    if (!chatId) return;

    if (chatId.startsWith('demo_') || currentUser.uid.startsWith('demo_')) {
      const load = () => {
        import('../services/demoService').then(({ getDemoMessages }) => {
          setMessages(getDemoMessages(chatId));
        });
      };
      load();
      const handler = () => load();
      window.addEventListener(`linkup_demo_msg_${chatId}`, handler);
      return () => window.removeEventListener(`linkup_demo_msg_${chatId}`, handler);
    }

    const messagesRef = collection(db, 'chats', chatId, 'messages');

    const unsubscribe = onSnapshot(
      messagesRef,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          msgs.push({
            id: docSnap.id,
            chatId,
            senderId: data.senderId,
            text: data.text || '',
            imageUrl: data.imageUrl || undefined,
            isViewOnce: data.isViewOnce || false,
            viewOnceOpened: data.viewOnceOpened || false,
            viewOnceOpenedAt: data.viewOnceOpenedAt || undefined,
            audioUrl: data.audioUrl || undefined,
            audioDuration: data.audioDuration || undefined,
            timestamp: data.timestamp,
            seen: data.seen ?? false,
            delivered: data.delivered ?? true,
            replyTo: data.replyTo || undefined,
            reactions: data.reactions || undefined,
          });
        });

        // Client-side timestamp sorting to guarantee no messages are omitted while serverTimestamp is resolving
        msgs.sort((a, b) => {
          const toTime = (t: any): number => {
            if (!t) return Date.now();
            if (typeof t.toMillis === 'function') return t.toMillis();
            if (t instanceof Date) return t.getTime();
            if (typeof t === 'number') return t;
            if (typeof t === 'string') return new Date(t).getTime();
            return 0;
          };
          return toTime(a.timestamp) - toTime(b.timestamp);
        });

        setMessages(msgs);

        // Mark messages as seen
        markMessagesAsSeen(chatId, currentUser.uid);
      },
      (error) => {
        console.warn('Real-time messages listener notice:', error);
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleEndCall = async (
    durationSeconds: number,
    callType: CallType,
    wasConnected: boolean
  ) => {
    setActiveCall(null);
    const now = Date.now();
    // Guard against duplicate / spam summary messages
    if (now - lastCallSummaryTimeRef.current < 4000) {
      return;
    }
    lastCallSummaryTimeRef.current = now;

    let summary = '';
    if (wasConnected && durationSeconds > 0) {
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      summary = `${callType === 'video' ? '📹 Video call' : '📞 Voice call'} • ${durationStr}`;
    } else {
      summary = `${callType === 'video' ? '📹 Cancelled video call' : '📞 Cancelled voice call'}`;
    }

    try {
      await sendMessage(chatId, currentUser.uid, otherUser.uid, summary);
    } catch (e) {}
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP, etc.).');
      return;
    }

    try {
      setIsCompressing(true);
      // Canvas compression produces a lightweight, optimized ~40-60KB JPEG base64 string
      const compressedDataUrl = await compressImageFile(file, 900, 0.68);
      setSelectedPhoto(compressedDataUrl);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Image compression failed:', err);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedPhoto) || isSending || isCompressing) return;

    const text = inputText;
    const photoToSend = selectedPhoto;
    const isViewOnce = isViewOnceActive;
    const replyMeta = replyingTo
      ? {
          id: replyingTo.id,
          text: replyingTo.text || (replyingTo.imageUrl ? (replyingTo.isViewOnce ? '🔒 View once photo' : '📷 Photo') : replyingTo.audioUrl ? '🎤 Voice note' : ''),
          senderName:
            replyingTo.senderId === currentUser.uid
              ? 'You'
              : otherUser.fullName,
        }
      : undefined;

    setInputText('');
    setSelectedPhoto(null);
    setIsViewOnceActive(false);
    setReplyingTo(null);
    setShowEmojiPicker(false);
    setIsSending(true);

    if (chatId.startsWith('demo_') || currentUser.uid.startsWith('demo_')) {
      const { sendDemoMessage } = await import('../services/demoService');
      sendDemoMessage(chatId, currentUser.uid, text, replyMeta, photoToSend || undefined, {
        isViewOnce,
      });
      setIsSending(false);
      inputRef.current?.focus();
      return;
    }

    try {
      await sendMessage(
        chatId,
        currentUser.uid,
        otherUser.uid,
        text,
        replyMeta,
        photoToSend || undefined,
        {
          isViewOnce,
        }
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendVoiceMessage = async (audioDataUrl: string, durationSeconds: number) => {
    setIsRecordingVoice(false);
    setIsSending(true);
    try {
      if (chatId.startsWith('demo_') || currentUser.uid.startsWith('demo_')) {
        const { sendDemoMessage } = await import('../services/demoService');
        sendDemoMessage(chatId, currentUser.uid, '', undefined, undefined, {
          audioUrl: audioDataUrl,
          audioDuration: durationSeconds,
        });
      } else {
        await sendMessage(chatId, currentUser.uid, otherUser.uid, '', undefined, undefined, {
          audioUrl: audioDataUrl,
          audioDuration: durationSeconds,
        });
      }
    } catch (err) {
      console.error('Failed to send voice note:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenViewOnce = (msg: Message) => {
    if (msg.senderId === currentUser.uid) {
      return;
    }
    if (msg.viewOnceOpened) {
      return;
    }
    setActiveViewOnceMsg(msg);
  };

  const handleCloseViewOnce = async () => {
    if (!activeViewOnceMsg) return;
    const msgToMark = activeViewOnceMsg;
    setActiveViewOnceMsg(null);

    try {
      if (chatId.startsWith('demo_') || currentUser.uid.startsWith('demo_')) {
        const { markDemoViewOnceAsOpened } = await import('../services/demoService');
        markDemoViewOnceAsOpened(chatId, msgToMark.id);
      } else {
        await markViewOnceAsOpened(chatId, msgToMark.id);
      }
    } catch (e) {
      console.warn('Error marking view once photo as opened:', e);
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionMenuMsgId(null);
    try {
      if (chatId.startsWith('demo_') || currentUser.uid.startsWith('demo_')) {
        const { toggleDemoMessageReaction } = await import('../services/demoService');
        toggleDemoMessageReaction(chatId, messageId, currentUser.uid, emoji);
      } else {
        await toggleMessageReaction(chatId, messageId, currentUser.uid, emoji);
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete) return;
    const id = messageToDelete.id;
    setMessageToDelete(null);
    try {
      if (chatId.startsWith('demo_') || currentUser.uid.startsWith('demo_')) {
        const { deleteDemoMessage } = await import('../services/demoService');
        deleteDemoMessage(chatId, id);
      } else {
        await deleteMessage(chatId, id);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors select-none">
      {/* Top Header App Bar */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 z-20 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-full text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            title="Back to chats"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Profile Picture with online status */}
          <div className="relative shrink-0">
            <img
              src={
                otherUser.profileImage ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.userId}`
              }
              alt={otherUser.fullName}
              className="w-10 h-10 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.userId}`;
              }}
            />
            {otherUser.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-900" />
            )}
          </div>

          {/* User Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {otherUser.fullName}
              </h2>
              {otherUser.isVerified && <VerifiedBadge size="xs" />}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1">
              <span>@{otherUser.userId}</span>
              <span>•</span>
              <span className={otherUser.isOnline ? 'text-emerald-500 font-medium' : ''}>
                {formatLastSeen(otherUser.isOnline, otherUser.lastSeen)}
              </span>
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
          <button
            onClick={() => setActiveCall('audio')}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            title="Start voice call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveCall('video')}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            title="Start video call"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={onBack}
            className="hidden md:flex p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Close conversation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="max-w-4xl mx-auto w-full space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
            <img
              src={
                otherUser.profileImage ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser.userId}`
              }
              alt={otherUser.fullName}
              className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-blue-500/20"
            />
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {otherUser.fullName}
            </h4>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">@{otherUser.userId}</p>
            {otherUser.bio && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 italic max-w-xs mt-2 bg-zinc-100 dark:bg-zinc-900/60 p-2 rounded-xl">
                "{otherUser.bio}"
              </p>
            )}
            <p className="mt-4 text-xs text-zinc-400">
              This is the beginning of your conversation with {otherUser.fullName}.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.uid;

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`relative max-w-[80%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl shadow-xs transition-all ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 rounded-bl-xs border border-zinc-200/50 dark:border-zinc-700/50'
                  }`}
                >
                  {/* Quoted Reply if any */}
                  {msg.replyTo && (
                    <div
                      className={`mb-1.5 p-2 rounded-lg text-xs border-l-2 truncate ${
                        isMe
                          ? 'bg-blue-700/60 border-white/80 text-blue-100'
                          : 'bg-zinc-100 dark:bg-zinc-700/50 border-blue-500 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      <div className="font-semibold text-[10px] uppercase tracking-wider mb-0.5 opacity-90">
                        {msg.replyTo.senderName}
                      </div>
                      <div className="truncate text-xs">{msg.replyTo.text}</div>
                    </div>
                  )}

                  {/* Voice Message Note if present */}
                  {msg.audioUrl && (
                    <div className="mb-1">
                      <VoiceMessagePlayer
                        audioUrl={msg.audioUrl}
                        duration={msg.audioDuration}
                        isMe={isMe}
                      />
                    </div>
                  )}

                  {/* View Once Photo message */}
                  {msg.isViewOnce && (
                    <div className="mb-1.5">
                      {isMe ? (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-blue-700/60 text-blue-100 text-xs">
                          <div className="w-6 h-6 rounded-full border border-blue-200 flex items-center justify-center font-bold text-[11px] shrink-0">
                            1
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold block">View-once photo</span>
                            <span className="text-[10px] text-blue-200 block truncate">
                              {msg.viewOnceOpened ? 'Opened by recipient' : 'Sent • Disappears after viewing'}
                            </span>
                          </div>
                        </div>
                      ) : msg.viewOnceOpened ? (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-700/40 text-zinc-400 dark:text-zinc-500 text-xs select-none">
                          <div className="w-6 h-6 rounded-full border border-zinc-300 dark:border-zinc-600 flex items-center justify-center font-bold text-[11px] shrink-0">
                            1
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold block line-through">Photo</span>
                            <span className="text-[10px] block">Opened • Disappeared</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenViewOnce(msg)}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-semibold cursor-pointer transition-all active:scale-95"
                          title="Open view-once photo"
                        >
                          <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            1
                          </div>
                          <div className="text-left min-w-0">
                            <span className="block font-bold">Photo</span>
                            <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400 block truncate">
                              View once • Tap to open
                            </span>
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Standard Photo (non view-once) */}
                  {msg.imageUrl && !msg.isViewOnce && (
                    <div
                      onClick={() => setViewingPhotoUrl(msg.imageUrl || null)}
                      className="mb-2 relative rounded-xl overflow-hidden cursor-pointer group/photo bg-black/5 dark:bg-black/30"
                    >
                      <img
                        src={msg.imageUrl}
                        alt="Shared photo"
                        loading="lazy"
                        className="w-full max-h-72 object-cover rounded-xl transition-transform duration-200 group-hover/photo:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-medium">
                        <ZoomIn className="w-4 h-4" />
                        <span>Tap to view full</span>
                      </div>
                    </div>
                  )}

                  {/* Message Text */}
                  {msg.text && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  )}

                  {/* Time & Delivery Status Indicator */}
                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                      isMe ? 'text-blue-100/80' : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    <span>{formatMessageTime(msg.timestamp)}</span>

                    {/* Status checks for sender */}
                    {isMe && (
                      <span className="shrink-0" title={msg.seen ? 'Seen' : msg.delivered ? 'Delivered' : 'Sent'}>
                        {msg.seen ? (
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                        ) : msg.delivered ? (
                          <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                        ) : (
                          <Check className="w-3 h-3 text-blue-200" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Reactions Pills */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div
                    className={`flex flex-wrap gap-1 mt-1 z-10 ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {Object.entries(msg.reactions).map(([emoji, uids]) => {
                      if (!uids || uids.length === 0) return null;
                      const hasReacted = uids.includes(currentUser.uid);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border shadow-xs transition-transform active:scale-90 cursor-pointer ${
                            hasReacted
                              ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700 font-semibold'
                              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                          }`}
                          title={`${uids.length} reaction${uids.length > 1 ? 's' : ''}${
                            hasReacted ? ' (tap to remove)' : ' (tap to add)'
                          }`}
                        >
                          <span className="text-sm leading-none">{emoji}</span>
                          <span className="text-[10px] font-medium leading-none">{uids.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Message Action Toolbar (React, Reply, Delete) */}
                <div
                  className={`relative flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${
                    isMe ? 'justify-end mr-1' : 'justify-start ml-1'
                  }`}
                >
                  {/* Quick Reaction floating bubble */}
                  {activeReactionMenuMsgId === msg.id && (
                    <div
                      className={`absolute bottom-full mb-1 z-30 flex items-center gap-1 p-1 bg-white dark:bg-zinc-900 rounded-full shadow-xl border border-zinc-200 dark:border-zinc-700 ${
                        isMe ? 'right-0' : 'left-0'
                      }`}
                    >
                      {['❤️', '👍', '😂', '😮', '😢', '🔥'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg.id, emoji)}
                          className="w-7 h-7 flex items-center justify-center text-base hover:scale-125 transition-transform cursor-pointer rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReactionMenuMsgId(null);
                          setPickerForReactionMsgId(msg.id);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:scale-110 transition-transform cursor-pointer rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="All emojis"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* React Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveReactionMenuMsgId(
                        activeReactionMenuMsgId === msg.id ? null : msg.id
                      )
                    }
                    className="p-1 rounded-full text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="React"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  {/* Reply Button */}
                  <button
                    type="button"
                    onClick={() => setReplyingTo(msg)}
                    className="p-1 rounded-full text-zinc-400 hover:text-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Reply"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Button (Sender or Admin) */}
                  {(isMe || currentUser.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => setMessageToDelete(msg)}
                      className="p-1 rounded-full text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Comprehensive Emojis picker for input */}
      {showEmojiPicker && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-20">
          <ComprehensiveEmojiPicker
            onSelectEmoji={handleAddEmoji}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Attached Photo Preview Above Input */}
      {selectedPhoto && (
        <div className="px-4 py-2.5 bg-blue-50/90 dark:bg-zinc-900 border-t border-blue-200/60 dark:border-zinc-800 transition-colors">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-blue-300 dark:border-zinc-700 shrink-0 bg-black/10">
                <img src={selectedPhoto} alt="Attachment" className="w-full h-full object-cover" />
                {isViewOnceActive && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-amber-400 font-bold text-xs">
                    1
                  </div>
                )}
              </div>
              <div className="text-xs min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Photo attached
                  </span>

                  {/* View Once Toggle button */}
                  <button
                    type="button"
                    onClick={() => setIsViewOnceActive(!isViewOnceActive)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      isViewOnceActive
                        ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-400/40'
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                    title={isViewOnceActive ? 'View-once enabled (tap to disable)' : 'Tap to make photo view-once (1 time only, screenshots blocked)'}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] font-extrabold leading-none">
                      1
                    </span>
                    <span>{isViewOnceActive ? 'View Once (1 Time)' : '1 Time'}</span>
                  </button>
                </div>
                <span className={`text-[11px] block truncate ${isViewOnceActive ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-zinc-500'}`}>
                  {isViewOnceActive
                    ? '🔒 View once: Disappears after opening • Screenshots blocked'
                    : 'Standard photo • Click "1 Time" to make it view-once'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPhoto(null);
                setIsViewOnceActive(false);
              }}
              className="p-1.5 rounded-full text-zinc-400 hover:text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Reply Preview Above Input */}
      {replyingTo && (
        <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Reply className="w-4 h-4 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block truncate">
                  Replying to{' '}
                  {replyingTo.senderId === currentUser.uid ? 'yourself' : otherUser.fullName}
                </span>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                  {replyingTo.text || (replyingTo.imageUrl ? (replyingTo.isViewOnce ? '🔒 View once photo' : '📷 Photo') : replyingTo.audioUrl ? '🎤 Voice note' : '')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Message Input Bottom Bar */}
      <form
        onSubmit={handleSend}
        className="px-4 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 z-20 transition-colors"
      >
        <div className="max-w-4xl mx-auto flex items-center gap-2 w-full">
          {isRecordingVoice ? (
            <VoiceRecorderBar
              onSendVoice={handleSendVoiceMessage}
              onCancel={() => setIsRecordingVoice(false)}
            />
          ) : (
            <>
              {/* Hidden file input for photo upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoSelect}
              />

              {/* Photo attach button */}
              <button
                type="button"
                disabled={isCompressing || isSending}
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                title="Send photo"
              >
                {isCompressing ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                ) : (
                  <ImageIcon className="w-5 h-5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                title="Add emoji"
              >
                <Smile className="w-5 h-5" />
              </button>

              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={
                    selectedPhoto
                      ? isViewOnceActive
                        ? 'Add a caption for view-once photo... (optional)'
                        : 'Add a caption... (optional, press Enter to send)'
                      : 'Type a message (Press Enter to send)...'
                  }
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="w-full px-4 py-2.5 text-sm rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 border border-transparent transition-all"
                />
              </div>

              {/* Show Mic button when input is empty, Send button when text or photo exists */}
              {!inputText.trim() && !selectedPhoto ? (
                <button
                  type="button"
                  onClick={() => setIsRecordingVoice(true)}
                  className="p-2.5 rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Record voice message"
                >
                  <Mic className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={(!inputText.trim() && !selectedPhoto) || isSending || isCompressing}
                  className="p-2.5 rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all cursor-pointer flex items-center justify-center shrink-0"
                  title="Send message (Enter)"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </form>

      {/* Active Audio / Video Call Overlay */}
      {activeCall && (
        <CallModal
          chatId={chatId}
          callType={activeCall}
          currentUser={currentUser}
          otherUser={otherUser}
          isInitiator={true}
          onEndCall={handleEndCall}
        />
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      <AnimatePresence>
        {viewingPhotoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingPhotoUrl(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 cursor-zoom-out select-none"
          >
            {/* Top Bar */}
            <div
              className="w-full max-w-4xl flex items-center justify-between pb-2 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs text-zinc-400 font-medium">LinkUp Photo Viewer</span>
              <div className="flex items-center gap-2">
                <a
                  href={viewingPhotoUrl}
                  download={`linkup_photo_${Date.now()}.jpg`}
                  className="p-2 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs px-3 shadow-md"
                  title="Save photo"
                >
                  <Download className="w-4 h-4" />
                  <span>Save</span>
                </a>
                <button
                  onClick={() => setViewingPhotoUrl(null)}
                  className="p-2 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-white transition-colors cursor-pointer shadow-md"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div
              className="relative flex-1 w-full max-w-4xl flex items-center justify-center overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={viewingPhotoUrl}
                alt="Full resolution view"
                className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl"
              />
            </div>

            <div className="text-[11px] text-zinc-500 pt-2">
              Tap anywhere outside or press Close to dismiss
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View-Once Protected Photo Modal with Screenshot Prevention */}
      <AnimatePresence>
        {activeViewOnceMsg && (
          <ViewOncePhotoModal
            imageUrl={activeViewOnceMsg.imageUrl || ''}
            senderName={otherUser.fullName}
            viewerUserId={currentUser.userId}
            onClose={handleCloseViewOnce}
          />
        )}
      </AnimatePresence>

      {/* Reaction Emoji Picker Modal */}
      <AnimatePresence>
        {pickerForReactionMsgId && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setPickerForReactionMsgId(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
            >
              <ComprehensiveEmojiPicker
                isReactionMode={true}
                onSelectEmoji={(emoji) => {
                  handleToggleReaction(pickerForReactionMsgId, emoji);
                  setPickerForReactionMsgId(null);
                }}
                onClose={() => setPickerForReactionMsgId(null)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Message Confirmation Dialog */}
      <AnimatePresence>
        {messageToDelete && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setMessageToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                    Delete Message?
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    This action will delete this message for everyone.
                  </p>
                </div>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-5 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
                Are you sure you want to delete this message? It will be removed permanently from the chat.
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setMessageToDelete(null)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
