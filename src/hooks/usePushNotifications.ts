'use client';

import { useEffect, useRef } from 'react';

/**
 * usePushNotifications
 * - Android (Capacitor) only: requests FCM permission, registers token, listens for push
 * - Web: no-op (push not supported in WebView-served Next.js)
 * - Calls /api/push/register to save FCM token server-side
 * - Handles 'scheduled_call' push type by navigating to talk page
 */
export function usePushNotifications(
  isLoggedIn: boolean,
  onScheduledCall?: (tutorId: string, tutorName: string) => void
) {
  const registered = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || registered.current) return;
    if (typeof window === 'undefined') return;

    // Only run on Capacitor (Android native)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.Capacitor?.isNativePlatform?.()) return;

    let cleanup: (() => void) | undefined;

    const initPush = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Check current permission status
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
          const requested = await PushNotifications.requestPermissions();
          if (requested.receive !== 'granted') {
            console.log('[TapTalk Push] Permission denied');
            return;
          }
        } else if (permStatus.receive !== 'granted') {
          console.log('[TapTalk Push] Permission not granted:', permStatus.receive);
          return;
        }

        // Register for push notifications (triggers FCM token generation)
        await PushNotifications.register();

        // Listen for registration success
        const regListener = await PushNotifications.addListener('registration', async (token) => {
          console.log('[TapTalk Push] FCM token received:', token.value.substring(0, 20) + '...');
          registered.current = true;

          // Send token to our server
          try {
            const res = await fetch('/api/push/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fcmToken: token.value }),
            });
            if (res.ok) {
              console.log('[TapTalk Push] Token registered on server');
            } else {
              console.error('[TapTalk Push] Server registration failed:', res.status);
            }
          } catch (err) {
            console.error('[TapTalk Push] Failed to register token:', err);
          }
        });

        // Listen for registration errors
        const errListener = await PushNotifications.addListener('registrationError', (error) => {
          console.error('[TapTalk Push] Registration error:', error);
        });

        // Listen for received push notifications (app in foreground)
        const receivedListener = await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            console.log('[TapTalk Push] Notification received:', notification);

            if (notification.data?.type === 'scheduled_call') {
              const { tutorId, tutorName } = notification.data;
              onScheduledCall?.(tutorId, tutorName);
            }
          }
        );

        // Listen for push notification action (user tapped notification)
        const actionListener = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            console.log('[TapTalk Push] Action performed:', action);

            const data = action.notification.data;
            if (data?.type === 'scheduled_call') {
              onScheduledCall?.(data.tutorId, data.tutorName);
            }
          }
        );

        cleanup = () => {
          regListener.remove();
          errListener.remove();
          receivedListener.remove();
          actionListener.remove();
        };
      } catch (err) {
        console.error('[TapTalk Push] Init error:', err);
      }
    };

    initPush();

    return () => {
      cleanup?.();
    };
  }, [isLoggedIn, onScheduledCall]);
}
