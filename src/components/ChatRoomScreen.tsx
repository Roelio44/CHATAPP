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
import { sendMessage, markMessagesAsSeen } from '../services/chatService';
import { formatMessageTime, formatLastSeen } from '../utils/formatTime';

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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time messages listener
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data();
          msgs.push({
            id: docSnap.id,
            chatId,
            senderId: data.senderId,
            text: data.text || '',
            timestamp: data.timestamp,
            seen: data.seen ?? false,
            delivered: data.delivered ?? true,
            replyTo: data.replyTo || undefined,
          });
        });
        setMessages(msgs);

        // Mark messages as seen
        markMessagesAsSeen(chatId, currentUser.uid);
      },
      (error) => {
        console.error('Error listening to messages:', error);
        handleFirestoreError(error, OperationType.LIST, `chats/${chatId}/messages`);
      }
    );

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText;
    const replyMeta = replyingTo
      ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderName:
            replyingTo.senderId === currentUser.uid
              ? 'You'
              : otherUser.fullName,
        }
      : undefined;

    setInputText('');
    setReplyingTo(null);
    setShowEmojiPicker(false);
    setIsSending(true);

    try {
      await sendMessage(
        chatId,
        currentUser.uid,
        otherUser.uid,
        text,
        replyMeta
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
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
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {otherUser.fullName}
            </h2>
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
            onClick={() => alert(`Calling ${otherUser.fullName}...`)}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Audio call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            onClick={() => alert(`Starting video call with ${otherUser.fullName}...`)}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Video call"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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

                  {/* Message Text */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.text}
                  </p>

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

                {/* Reply action button on hover */}
                <button
                  onClick={() => setReplyingTo(msg)}
                  className={`mt-1 text-[11px] text-zinc-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 cursor-pointer ${
                    isMe ? 'mr-1' : 'ml-1'
                  }`}
                >
                  <Reply className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emojis bar */}
      {showEmojiPicker && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="px-4 py-2 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-around gap-2"
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleAddEmoji(emoji)}
              className="text-xl p-1 hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </motion.div>
      )}

      {/* Reply Preview Above Input */}
      {replyingTo && (
        <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block truncate">
                Replying to{' '}
                {replyingTo.senderId === currentUser.uid ? 'yourself' : otherUser.fullName}
              </span>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
                {replyingTo.text}
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
      )}

      {/* Message Input Bottom Bar */}
      <form
        onSubmit={handleSend}
        className="px-3 py-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center gap-2 z-20 transition-colors"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full px-4 py-2.5 text-sm rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 border border-transparent transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="p-2.5 rounded-full bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all cursor-pointer flex items-center justify-center shrink-0"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
