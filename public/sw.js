/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Service Worker for AlbaniaCHAT
const CACHE_NAME = 'albaniachat-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push notifications (if sent from backend push service)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'AlbaniaCHAT';
    const options = {
      body: payload.body || 'You have a new notification',
      icon: payload.icon || '/favicon.ico',
      badge: payload.badge || '/favicon.ico',
      tag: payload.tag || 'albaniachat-notification',
      data: payload.data || {},
      vibrate: payload.vibrate || [200, 100, 200],
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('AlbaniaCHAT', {
        body: text,
        icon: '/favicon.ico',
      })
    );
  }
});

// Handle clicking on a notification in the notification center or lock screen
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && event.notification.data?.chatId) {
            client.postMessage({
              type: 'OPEN_CHAT',
              chatId: event.notification.data.chatId,
            });
          }
          return client.focus();
        }
      }

      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages sent from client pages to the service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
