'use client';

import { useEffect, useRef } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Convert URL-safe base64 to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * usePushNotifications
 * - Android (Capacitor): FCM push via native plugin
 * - Web (all browsers): Web Push via Service Worker
 * - Calls appropriate API to save push token/subscription server-side
 * - Handles 'scheduled_call' push type
 */
export function usePushNotifications(
  isLoggedIn: boolean,
  onScheduledCall?: (tutorId: string, tutorName: string) => void
) {
  const registered = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || registered.current) return;
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const isNative = !!win.Capacitor?.isNativePlatform?.();

    if (isNative) {
      initNativePush(registered, onScheduledCall);
    } else {
      initWebPush(registered);
    }
  }, [isLoggedIn, onScheduledCall]);
}

/**
 * Native (Capacitor) FCM push
 */
async function initNativePush(
  registered: React.MutableRefObject<boolean>,
  onScheduledCall?: (tutorId: string, tutorName: string) => void
) {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      const requested = await PushNotifications.requestPermissions();
      if (requested.receive !== 'granted') {
        return;
      }
    } else if (permStatus.receive !== 'granted') {
      return;
    }

    await PushNotifications.register();

    await PushNotifications.addListener('registration', async (token) => {
      registered.current = true;

      try {
        const regRes = await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcmToken: token.value }),
        });
        if (!regRes.ok) {
          console.error('[TapTalk Push] FCM register failed:', regRes.status);
        }
      } catch (err) {
        console.error('[TapTalk Push] FCM register failed:', err);
      }
    });

    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[TapTalk Push] Registration error:', error);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      if (notification.data?.type === 'scheduled_call') {
        onScheduledCall?.(notification.data.tutorId, notification.data.tutorName);
      }
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data;
      if (data?.type === 'scheduled_call') {
        onScheduledCall?.(data.tutorId, data.tutorName);
      }
    });
  } catch (err) {
    console.error('[TapTalk Push] Native init error:', err);
  }
}

/**
 * Web Push via Service Worker
 */
async function initWebPush(registered: React.MutableRefObject<boolean>) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      return;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js');

    // Wait for SW to be ready
    await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Only subscribe if permission is already granted (requested from ScheduleSettings UI)
      if (Notification.permission !== 'granted') {
        return;
      }

      // Subscribe to push
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    // Send subscription to server
    const res = await fetch('/api/push/register-web', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });

    if (res.ok) {
      registered.current = true;
    } else {
      console.error('[TapTalk Push] Web Push server registration failed');
    }
  } catch (err) {
    console.error('[TapTalk Push] Web init error:', err);
  }
}
