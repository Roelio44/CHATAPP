/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Push / Web Notifications Service for LinkUp Messenger
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('Notification permission request error:', e);
      return false;
    }
  }

  return false;
}

export function sendWebNotification(title: string, options?: NotificationOptions): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission === 'granted') {
    try {
      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    } catch (e) {
      console.warn('Failed to dispatch notification:', e);
    }
  }

  return null;
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

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
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

    // Vibrate device if vibration API is available
    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400, 200, 400]);
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
