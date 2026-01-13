
'use client';

import { useEffect, useState } from 'react';
import { useMessaging, useUser, useFirestore } from '@/firebase/provider';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { VAPID_KEY } from '@/firebase/config';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export function NotificationManager() {
  const { user } = useUser();
  const messaging = useMessaging();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'prompt' | 'unsupported'>('prompt');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration errors by only rendering on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      
      // Check if we're in a native Capacitor app - web push doesn't work there
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        setNotificationPermission('unsupported');
        return;
      }
      
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
    if (isLoading) return; // Prevent double-clicks
    
    console.log('requestPermission called', { messaging: !!messaging, user: !!user, firestore: !!firestore });
    
    // Check if we're in a native Capacitor app
    const isNative = Capacitor.isNativePlatform();
    if (isNative) {
      toast({
        title: 'Native App Detected',
        description: 'Web push notifications don\'t work in native apps. Use the browser or PWA version to enable notifications, or we can add native push notifications later.',
        variant: 'destructive',
      });
      return;
    }
    
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Notifications are not supported in this environment. Try using a browser or PWA version.',
        variant: 'destructive',
      });
      return;
    }

    if (!messaging || !user || !firestore) {
      toast({
        title: 'Error',
        description: 'Firebase services are not ready. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      console.log('Notification permission result:', permission);
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
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
          } else {
            toast({
              title: 'Error',
              description: 'Failed to get notification token. Please try again.',
              variant: 'destructive',
            });
          }
        } catch (err) {
          console.error('Error getting token:', err);
          toast({
            title: 'Error',
            description: 'Failed to enable notifications. Please try again.',
            variant: 'destructive',
          });
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
    } finally {
      setIsLoading(false);
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store dismissal in localStorage so it persists
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification-prompt-dismissed', 'true');
    }
  }

  // Prevent hydration errors - don't render until mounted
  if (!isMounted) {
    return null;
  }

  // Don't show notification prompt if user is not logged in
  if (!user) {
    return null;
  }

  // Don't show prompt in native apps - web push doesn't work there
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    return null;
  }

  // Show prompt if permission is 'prompt' and not dismissed
  // Also show if permission was denied but user might want to try again
  if (notificationPermission === 'prompt' && !isDismissed) {
      return (
          <div className="fixed bottom-24 right-4 z-[100] sm:bottom-20 pointer-events-auto">
              <div className="bg-background border rounded-lg shadow-lg p-4 max-w-sm relative pointer-events-auto">
                  <button
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDismiss();
                      }}
                      className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors z-10 pointer-events-auto"
                      aria-label="Close"
                      type="button"
                  >
                      <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <p className="text-sm font-medium pr-6">Enable Notifications</p>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Get reminders and alerts from your circle. You can also enable this later from the notification bell icon.
                  </p>
                  <Button 
                      onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          requestPermission();
                      }}
                      size="lg" 
                      className="w-full touch-manipulation min-h-[44px] text-base pointer-events-auto"
                      style={{ WebkitTapHighlightColor: 'transparent', pointerEvents: 'auto' }}
                      type="button"
                      disabled={isLoading}
                  >
                      {isLoading ? 'Enabling...' : 'Enable'}
                  </Button>
              </div>
          </div>
      )
  }

  // If permission was denied, show a less intrusive reminder
  if (notificationPermission === 'denied' && !isDismissed) {
      return (
          <div className="fixed bottom-24 right-4 z-[100] sm:bottom-20">
              <div className="bg-muted border rounded-lg shadow-lg p-3 max-w-sm relative">
                  <button
                      onClick={handleDismiss}
                      className="absolute top-2 right-2 p-1 rounded-md hover:bg-background transition-colors"
                      aria-label="Close"
                  >
                      <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Notifications are blocked. Click the bell icon to enable them.
                  </p>
              </div>
          </div>
      )
  }

  return null;
}
