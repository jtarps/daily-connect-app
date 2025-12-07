
'use client';

import { useEffect, useState } from 'react';
import { useMessaging, useUser, useFirestore } from '@/firebase/provider';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { VAPID_KEY } from '@/firebase/config';
import { Button } from '../ui/button';

export function NotificationManager() {
  const { user } = useUser();
  const messaging = useMessaging();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'prompt' | 'unsupported'>('prompt');

  // Effect to listen for incoming foreground messages
  useEffect(() => {
    if (!messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received.', payload);
      toast({
        title: payload.notification?.title,
        description: payload.notification?.body,
      });
    });

    return () => unsubscribe();
  }, [messaging, toast]);

  // Effect to handle token registration
  useEffect(() => {
    const handleTokenRegistration = async () => {
      if (!messaging || !user || !firestore) return;
      if (typeof window === 'undefined' || !('Notification' in window)) {
        setNotificationPermission('unsupported');
        return;
      }
      
      // Check current permission status
      const currentPermission = Notification.permission;
      if (currentPermission !== 'granted') {
          setNotificationPermission(currentPermission);
          return;
      }
       setNotificationPermission('granted');

      try {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          console.log('FCM Token:', currentToken);
          // Save the token to Firestore
          const tokenRef = doc(firestore, 'users', user.uid, 'fcmTokens', currentToken);
          await setDoc(tokenRef, {
            token: currentToken,
            createdAt: serverTimestamp(),
          });
        } else {
          console.log('No registration token available. Request permission to generate one.');
           setNotificationPermission('prompt');
        }
      } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
        setNotificationPermission('unsupported');
      }
    };

    handleTokenRegistration();
  }, [messaging, user, firestore]);
  
  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        // Rerun the token registration effect
        // This is a bit of a hack, but it's simple
        window.location.reload(); 
      }
    }
  }

  // This component doesn't render anything itself, but it could render a UI for managing notifications.
  // For example, if permission is 'prompt', render a button to request it.
  if (notificationPermission === 'prompt') {
      return (
          <div className="fixed bottom-24 right-4 z-[100] sm:bottom-20">
              <div className="bg-background border rounded-lg shadow-lg p-4 max-w-sm">
                  <p className="text-sm font-medium">Enable Notifications</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">Get reminders and alerts from your circle.</p>
                  <Button 
                      onClick={requestPermission} 
                      size="lg" 
                      className="w-full touch-manipulation min-h-[44px] text-base"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                      Enable
                  </Button>
              </div>
          </div>
      )
  }

  return null;
}
