
'use client';

import { useEffect, useState } from 'react';
import { useMessaging, useUser, useFirestore } from '@/firebase/provider';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { VAPID_KEY } from '@/firebase/config';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

export function NotificationManager() {
  const { user } = useUser();
  const messaging = useMessaging();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'prompt' | 'unsupported'>('prompt');
  const [isDismissed, setIsDismissed] = useState(false);

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
      
      // Check if user dismissed the prompt
      const wasDismissed = localStorage.getItem('notification-prompt-dismissed');
      if (wasDismissed === 'true') {
        setIsDismissed(true);
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
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          // Trigger token registration by updating state
          // The useEffect will handle token registration
          if (messaging && user && firestore) {
            try {
              const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
              if (currentToken) {
                console.log('FCM Token:', currentToken);
                const tokenRef = doc(firestore, 'users', user.uid, 'fcmTokens', currentToken);
                await setDoc(tokenRef, {
                  token: currentToken,
                  createdAt: serverTimestamp(),
                });
                toast({
                  title: 'Notifications Enabled',
                  description: 'You\'ll now receive reminders and alerts from your circle.',
                });
                setIsDismissed(true);
              }
            } catch (err) {
              console.error('Error getting token:', err);
              toast({
                title: 'Error',
                description: 'Failed to enable notifications. Please try again.',
                variant: 'destructive',
              });
            }
          }
        } else if (permission === 'denied') {
          toast({
            title: 'Notifications Blocked',
            description: 'Please enable notifications in your browser settings.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        toast({
          title: 'Error',
          description: 'Failed to request notification permission.',
          variant: 'destructive',
        });
      }
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store dismissal in localStorage so it persists
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification-prompt-dismissed', 'true');
    }
  }

  // Don't show notification prompt if user is not logged in
  if (!user) {
    return null;
  }

  // This component doesn't render anything itself, but it could render a UI for managing notifications.
  // For example, if permission is 'prompt', render a button to request it.
  if (notificationPermission === 'prompt' && !isDismissed) {
      return (
          <div className="fixed bottom-24 right-4 z-[100] sm:bottom-20">
              <div className="bg-background border rounded-lg shadow-lg p-4 max-w-sm relative">
                  <button
                      onClick={handleDismiss}
                      className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors"
                      aria-label="Close"
                  >
                      <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <p className="text-sm font-medium pr-6">Enable Notifications</p>
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
