// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'MenuLove';
  const options = {
    body: data.body || 'New visitor on your site!',
    icon: '/menulove-logo.png',
    badge: '/menulove-logo.png',
    vibrate: [200, 100, 200],
    tag: 'visitor-notification',
    requireInteraction: false,
    data: {
      url: data.url || '/admin'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
