/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Push / Web Notifications & Service Worker Service for AlbaniaCHAT
 * Delivers background push notifications for incoming messages and calls
 * even when the user is outside the app, minimized, or phone is locked.
 */

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Initializes and registers the background Service Worker (/sw.js)
 */
export async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    swRegistration = reg;
    return reg;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

/**
 * Check if notifications are currently permitted
 */
export function isNotificationPermissionGranted(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Request system notification permission and prepare the Service Worker
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    // Ensure service worker is registered
    initServiceWorker().catch(() => {});
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        initServiceWorker().catch(() => {});
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Notification permission request error:', e);
      return false;
    }
  }

  return false;
}

export interface AppNotificationOptions extends NotificationOptions {
  vibrate?: any;
  data?: any;
  actions?: any[];
}

/**
 * Dispatches a native operating system push notification.
 * Uses ServiceWorkerRegistration.showNotification() for reliable background/minimized delivery
 * across Android, iOS PWA, macOS, and Windows, with fallback to standard Notification constructor.
 */
export async function sendWebNotification(
  title: string,
  options?: AppNotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: any = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    ...options,
  };

  // 1. Prefer ServiceWorker registration (REQUIRED for mobile and background delivery)
  try {
    if ('serviceWorker' in navigator) {
      const reg = swRegistration || (await navigator.serviceWorker.ready.catch(() => null));
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }
  } catch (err) {
    console.warn('ServiceWorker showNotification failed, trying fallback:', err);
  }

  // 2. Fallback to standard window.Notification constructor (desktop browsers)
  try {
    const notif = new Notification(title, notificationOptions);
    if (options?.data?.url && typeof window !== 'undefined') {
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
    return true;
  } catch (e) {
    console.warn('Standard Notification constructor failed:', e);
  }

  return false;
}

/**
 * Plays a pleasant modern audio chime when a new message arrives.
 */
export function playMessageSound(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    // Two-tone rising chime (587.33Hz D5 -> 880Hz A5)
    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);

    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.08);

    osc1.stop(ctx.currentTime + 0.35);
    osc2.stop(ctx.currentTime + 0.35);

    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      } catch (e) {}
    }, 500);

    // Subtle vibration on supported mobile devices
    if (navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  } catch (err) {
    // Audio context may be restricted by autoplay policy
  }
}

/**
 * Synthesizes an incoming call ringtone using Web Audio API.
 * Returns a cleanup function that stops ringing.
 */
export function playIncomingCallSound(): () => void {
  if (typeof window === 'undefined') return () => {};

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return () => {};
    const ctx = new AudioCtx();

    let isPlaying = true;
    let timer: any = null;

    const ring = () => {
      if (!isPlaying || ctx.state === 'closed') return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 1.2);
      osc2.stop(ctx.currentTime + 1.2);

      timer = setTimeout(ring, 2200);
    };

    ring();

    // Vibrate device rhythmically if vibration API is available
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }

    return () => {
      isPlaying = false;
      if (timer) clearTimeout(timer);
      try {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      } catch (e) {}
      if (navigator.vibrate) {
        navigator.vibrate(0);
      }
    };
  } catch (err) {
    return () => {};
  }
}
