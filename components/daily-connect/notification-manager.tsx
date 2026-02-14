
'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const [notificationPermission, setNotificationPermission] = useState<string>('prompt');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Web: Listen for foreground messages
  useEffect(() => {
    if (!messaging || isNative) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      toast({
        title: payload.notification?.title,
        description: payload.notification?.body,
      });
    });

    return () => unsubscribe();
  }, [messaging, toast, isNative]);

  // Native: Set up Capacitor push notifications
  useEffect(() => {
    if (!isNative || !user || !firestore || !isMounted) return;

    let registrationCleanup: (() => void) | undefined;
    let foregroundCleanup: (() => void) | undefined;

    const setupNativePush = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Check current permission
        const permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'granted') {
          setNotificationPermission('granted');
          await PushNotifications.register();
        } else if (permStatus.receive === 'denied') {
          setNotificationPermission('denied');
        } else {
          setNotificationPermission('prompt');
        }

        // Listen for successful registration (get APNs token)
        const regListener = await PushNotifications.addListener('registration', async (token) => {
          if (!user || !firestore) return;
          try {
            const tokenRef = doc(firestore, 'users', user.uid, 'fcmTokens', token.value);
            await setDoc(tokenRef, {
              token: token.value,
              type: 'apns',
              platform: 'ios',
              createdAt: serverTimestamp(),
            });
          } catch (err) {
            console.error('Failed to store native push token:', err);
          }
        });
        registrationCleanup = () => regListener.remove();

        // Listen for registration errors
        await PushNotifications.addListener('registrationError', (err) => {
          console.error('Native push registration error:', err);
        });

        // Listen for foreground notifications
        const fgListener = await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          toast({
            title: notification.title || 'Notification',
            description: notification.body,
          });
        });
        foregroundCleanup = () => fgListener.remove();
      } catch (err) {
        console.error('Error setting up native push:', err);
      }

      // Check dismissal status
      const wasDismissed = localStorage.getItem('notification-prompt-dismissed');
      if (wasDismissed === 'true') {
        setIsDismissed(true);
      }
    };

    setupNativePush();

    return () => {
      registrationCleanup?.();
      foregroundCleanup?.();
    };
  }, [isNative, user, firestore, isMounted, toast]);

  // Web: Handle token registration
  useEffect(() => {
    if (isNative) return;

    const handleTokenRegistration = async () => {
      if (!messaging || !user || !firestore) return;

      if (typeof window === 'undefined' || !('Notification' in window)) {
        setNotificationPermission('unsupported');
        return;
      }

      const wasDismissed = localStorage.getItem('notification-prompt-dismissed');
      if (wasDismissed === 'true') {
        setIsDismissed(true);
      }

      const currentPermission = Notification.permission;
      if (currentPermission !== 'granted') {
        setNotificationPermission(currentPermission);
        return;
      }
      setNotificationPermission('granted');

      try {
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (currentToken) {
          const tokenRef = doc(firestore, 'users', user.uid, 'fcmTokens', currentToken);
          await setDoc(tokenRef, {
            token: currentToken,
            createdAt: serverTimestamp(),
          });
        } else {
          setNotificationPermission('prompt');
        }
      } catch (err) {
        console.error('Error retrieving FCM token:', err);
        setNotificationPermission('unsupported');
      }
    };

    handleTokenRegistration();
  }, [messaging, user, firestore, isNative]);

  // Permission request handler (works for both web and native)
  const requestPermission = useCallback(async () => {
    if (isLoading) return;

    // Native path
    if (isNative) {
      if (!user || !firestore) return;
      setIsLoading(true);
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const result = await PushNotifications.requestPermissions();

        if (result.receive === 'granted') {
          setNotificationPermission('granted');
          await PushNotifications.register();
          toast({
            title: 'Notifications Enabled',
            description: "You'll now receive reminders and alerts from your circle.",
          });
          setIsDismissed(true);
        } else {
          setNotificationPermission('denied');
          toast({
            title: 'Notifications Blocked',
            description: 'You can enable notifications in Settings > FamShake > Notifications.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error requesting native push permission:', error);
        toast({
          title: 'Error',
          description: 'Failed to enable notifications.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Web path
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Notifications are not supported in this environment.',
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
      setNotificationPermission(permission);

      if (permission === 'granted') {
        try {
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
          if (currentToken) {
            const tokenRef = doc(firestore, 'users', user.uid, 'fcmTokens', currentToken);
            await setDoc(tokenRef, {
              token: currentToken,
              createdAt: serverTimestamp(),
            });
            toast({
              title: 'Notifications Enabled',
              description: "You'll now receive reminders and alerts from your circle.",
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
          console.error('Error getting FCM token:', err);
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
  }, [isLoading, isNative, user, firestore, messaging, toast]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('notification-prompt-dismissed', 'true');
    }
  }

  if (!isMounted || !user) {
    return null;
  }

  // Show prompt if permission is 'prompt' and not dismissed
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
                    {isNative
                      ? 'Notifications are blocked. Go to Settings > FamShake to enable them.'
                      : 'Notifications are blocked. Click the bell icon to enable them.'}
                  </p>
              </div>
          </div>
      )
  }

  return null;
}
