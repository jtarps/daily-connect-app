
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { doc, serverTimestamp, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import { X } from 'lucide-react';
import { isNativePlatform } from '@/lib/platform';

export function NotificationManager() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<string>('prompt');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set up push notifications (native iOS via Capacitor)
  useEffect(() => {
    if (!user || !firestore || !isMounted) return;

    let registrationCleanup: (() => void) | undefined;
    let foregroundCleanup: (() => void) | undefined;

    const setupPush = async () => {
      // Check dismissal status
      const wasDismissed = localStorage.getItem('notification-prompt-dismissed');
      if (wasDismissed === 'true') {
        setIsDismissed(true);
      }

      // Try native Capacitor push first
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

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

            // Clean up any stale web FCM tokens
            const tokensSnapshot = await getDocs(
              collection(firestore, 'users', user.uid, 'fcmTokens')
            );
            for (const tokenDoc of tokensSnapshot.docs) {
              const data = tokenDoc.data();
              if (data.type !== 'apns' && tokenDoc.id !== token.value) {
                await deleteDoc(doc(firestore, 'users', user.uid, 'fcmTokens', tokenDoc.id));
              }
            }
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

        // Native setup succeeded — don't fall through to web
        return;
      } catch (err) {
        // Capacitor PushNotifications not available (running in browser)
        console.log('Native push not available, this is expected in browser:', err);
      }

      // Only reach here if NOT running in native app
      // Skip web FCM registration if we detect native platform (avoids stale web tokens)
      if (isNativePlatform()) {
        console.log('Detected native platform but PushNotifications plugin unavailable');
        return;
      }
    };

    setupPush();

    return () => {
      registrationCleanup?.();
      foregroundCleanup?.();
    };
  }, [user, firestore, isMounted, toast]);

  // Permission request handler
  const requestPermission = useCallback(async () => {
    if (isLoading || !user || !firestore) return;

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
        localStorage.removeItem('notification-prompt-dismissed');
      } else {
        setNotificationPermission('denied');
        toast({
          title: 'Notifications Blocked',
          description: 'You can enable notifications in Settings > FamShake > Notifications.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user, firestore, toast]);

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
                    Get reminders and alerts from your circle.
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
                    Notifications are blocked. Go to Settings &gt; FamShake to enable them.
                  </p>
              </div>
          </div>
      )
  }

  return null;
}
