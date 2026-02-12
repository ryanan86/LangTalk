/**
 * TapTalk Service Worker
 * Handles web push notifications for scheduled call reminders
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'Time for your English practice!',
      icon: '/app-icon-192.png',
      badge: '/app-icon-192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'scheduled-call',
      renotify: true,
      requireInteraction: true,
      data: {
        type: data.type || 'scheduled_call',
        tutorId: data.tutorId || 'emma',
        tutorName: data.tutorName || 'Emma',
        url: data.url || '/incoming-call?tutor=' + (data.tutorId || 'emma'),
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'TapTalk', options)
    );
  } catch (err) {
    console.error('[SW] Push parse error:', err);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  const url = data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing TapTalk tab if open
      for (const client of windowClients) {
        if (client.url.includes('taptalk.xyz') && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open new tab
      return clients.openWindow(url);
    })
  );
});
