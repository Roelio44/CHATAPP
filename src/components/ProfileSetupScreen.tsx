/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Camera, Check, X, Loader2, AtSign, User, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
];

export const ProfileSetupScreen: React.FC = () => {
  const { currentUser, createUserProfile, checkUserIdAvailable } = useAuth();

  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [userId, setUserId] = useState(() => {
    if (currentUser?.email) {
      return currentUser.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);
    }
    return '';
  });
  const [profileImage, setProfileImage] = useState(
    currentUser?.photoURL || DEFAULT_AVATARS[0]
  );
  const [bio, setBio] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);

  // Availability checking state
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced check for user ID availability
  useEffect(() => {
    const cleanId = userId.trim().replace(/^@/, '').toLowerCase();
    if (!cleanId || cleanId.length < 3) {
      setIsAvailable(null);
      setAvailabilityMessage('User ID must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(cleanId)) {
      setIsAvailable(false);
      setAvailabilityMessage('Only letters, numbers, and underscores allowed');
      return;
    }

    setIsChecking(true);
    const timer = setTimeout(async () => {
      try {
        const available = await checkUserIdAvailable(cleanId);
        setIsAvailable(available);
        setAvailabilityMessage(
          available ? `@${cleanId} is available` : `@${cleanId} is already taken`
        );
      } catch (e) {
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [userId, checkUserIdAvailable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!isAvailable) {
      setError('Please choose a valid and available User ID');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createUserProfile({
        fullName: fullName.trim(),
        userId: userId.trim().replace(/^@/, '').toLowerCase(),
        profileImage,
        bio: bio.trim(),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile setup');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col justify-between px-6 py-6 max-w-md mx-auto select-none">
      {/* Top Header */}
      <div className="text-center pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Step 2 of 2: Profile Setup</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Create Your Profile
        </h1>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Set up how your friends will find and message you
        </p>
      </div>

      <form onSubmit={handleSubmit} className="my-auto py-4 space-y-5">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Profile Image Section */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <img
              src={profileImage}
              alt="Profile preview"
              className="w-24 h-24 rounded-full object-cover border-3 border-blue-600/30 dark:border-blue-500/40 shadow-md shadow-blue-500/10"
              onError={() =>
                setProfileImage(`https://api.dicebear.com/7.x/bottts/svg?seed=${userId || 'linkup'}`)
              }
            />
            <button
              type="button"
              onClick={() => setShowCustomUrlInput(!showCustomUrlInput)}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 transition-transform active:scale-90 cursor-pointer"
              title="Change photo URL"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Quick preset avatars */}
          <div className="mt-3.5 flex items-center justify-center gap-2">
            {DEFAULT_AVATARS.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setProfileImage(url)}
                className={`w-8 h-8 rounded-full overflow-hidden transition-all cursor-pointer ${
                  profileImage === url
                    ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-zinc-950 scale-105'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {showCustomUrlInput && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 w-full"
            >
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste image URL (https://...)"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customImageUrl.trim()) {
                      setProfileImage(customImageUrl.trim());
                      setShowCustomUrlInput(false);
                    }
                  }}
                  className="px-3 py-1.5 text-xs bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg font-medium"
                >
                  Use
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Full Name Field */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="e.g. Dhiraj Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={60}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Unique User ID Field with Live Availability Indicator */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Unique User ID
            </label>
            <span className="text-[10px] text-zinc-400">Letters, numbers, underscores</span>
          </div>

          <div className="relative">
            <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="dhiraj247"
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              required
              minLength={3}
              maxLength={30}
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white dark:bg-zinc-900 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden transition-all ${
                isAvailable === true
                  ? 'border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/20'
                  : isAvailable === false
                  ? 'border-rose-500/80 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-zinc-200 dark:border-zinc-700/80 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'
              }`}
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              ) : isAvailable === true ? (
                <Check className="w-4 h-4 text-emerald-500 font-bold" />
              ) : isAvailable === false ? (
                <X className="w-4 h-4 text-rose-500 font-bold" />
              ) : null}
            </div>
          </div>

          {availabilityMessage && (
            <p
              className={`mt-1 text-xs font-medium ${
                isAvailable === true
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isAvailable === false
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              {availabilityMessage}
            </p>
          )}
        </div>

        {/* Short Bio (Optional) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            Bio <span className="text-zinc-400 lowercase font-normal">(optional)</span>
          </label>
          <textarea
            placeholder="Available on LinkUp..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={2}
            maxLength={180}
            className="w-full px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
          />
        </div>

        {/* Continue Button */}
        <button
          type="submit"
          disabled={!isAvailable || isChecking || isSubmitting || !fullName.trim()}
          className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <span>Complete Setup & Enter LinkUp</span>
          )}
        </button>
      </form>

      <div className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 pb-2">
        You can always customize your bio and photo later in Profile settings.
      </div>
    </div>
  );
};
