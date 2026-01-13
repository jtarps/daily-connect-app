// Firebase Cloud Messaging Service Worker
// This service worker handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase - the main app will have already initialized it
// We just need to get the messaging instance
// Note: Firebase Messaging v9+ handles initialization automatically when getMessaging() is called
// The service worker just needs to handle background messages

try {
  // Get the default Firebase app (should already be initialized by main app)
  const app = firebase.app();
  const messaging = firebase.messaging(app);
  
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    const notificationTitle = payload.notification?.title || 'Daily Connect';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: payload.data?.tag || 'default',
      requireInteraction: false,
      data: payload.data || {},
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
  
  console.log('[firebase-messaging-sw.js] Firebase Messaging background handler registered');
} catch (error) {
  console.error('[firebase-messaging-sw.js] Error setting up Firebase Messaging:', error);
}
