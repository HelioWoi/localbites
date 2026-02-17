// Web Push Notification Service

const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY'; // Will be generated

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

// Check if notifications are supported
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Get current notification permission status
export const getNotificationPermission = (): NotificationPermissionStatus => {
  if (!isNotificationSupported()) {
    return { granted: false, denied: true, default: false };
  }

  const permission = Notification.permission;
  return {
    granted: permission === 'granted',
    denied: permission === 'denied',
    default: permission === 'default'
  };
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) {
    console.error('Notifications not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Register service worker
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  try {
    const registration = await registerServiceWorker();
    if (!registration) return null;

    const permission = await requestNotificationPermission();
    if (!permission) return null;

    // Convert VAPID key to Uint8Array
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey as BufferSource
    });

    console.log('Push subscription:', subscription);
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push notifications');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
};

// Send test notification
export const sendTestNotification = async (): Promise<void> => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    console.error('Notifications not permitted');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('MenuLove Test', {
      body: 'Push notifications are working! 🎉',
      icon: '/menulove-logo.png',
      badge: '/menulove-logo.png',
      tag: 'test-notification'
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Save subscription to backend (for sending notifications later)
export const saveSubscriptionToBackend = async (subscription: PushSubscription): Promise<boolean> => {
  try {
    // Store subscription in localStorage for now
    // In production, send to your backend
    localStorage.setItem('push_subscription', JSON.stringify(subscription));
    console.log('Subscription saved');
    return true;
  } catch (error) {
    console.error('Error saving subscription:', error);
    return false;
  }
};

// Get saved subscription
export const getSavedSubscription = (): PushSubscription | null => {
  try {
    const saved = localStorage.getItem('push_subscription');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};
