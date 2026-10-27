/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function formatMessageTime(timestamp: any): string {
  if (!timestamp) return '';

  let date: Date;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number' || typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'Just now';
  }

  // Same day
  if (now.toDateString() === date.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return 'Yesterday';
  }

  // Within a week
  if (diffDay < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  // Standard date
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatLastSeen(isOnline?: boolean, lastSeen?: any): string {
  if (isOnline) {
    return 'Online';
  }
  if (!lastSeen) {
    return 'Offline';
  }

  let date: Date;
  if (lastSeen.toDate && typeof lastSeen.toDate === 'function') {
    date = lastSeen.toDate();
  } else if (lastSeen instanceof Date) {
    date = lastSeen;
  } else if (typeof lastSeen === 'number' || typeof lastSeen === 'string') {
    date = new Date(lastSeen);
  } else {
    return 'Offline';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'Last seen just now';
  if (diffMin < 60) return `Last seen ${diffMin}m ago`;
  if (diffHour < 24 && now.toDateString() === date.toDateString()) {
    return `Last seen today at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }

  return `Last seen ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}
