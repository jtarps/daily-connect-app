'use client';

import { useState, useEffect } from 'react';
import { useMessaging, useUser, useFirestore } from '@/firebase/provider';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, serverTimestamp, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { VAPID_KEY } from '@/firebase/config';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, BellOff, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Capacitor } from '@capacitor/core';

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettings({ open, onOpenChange }: NotificationSettingsProps) {
  const { user } = useUser();
  const messaging = useMessaging();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<string>('prompt');
  const [fcmTokens, setFcmTokens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

  // Check permission status and existing tokens
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || !firestore) return;

      setIsChecking(true);

      if (isNative) {
        // Native: check via Capacitor
        try {
          const { PushNotifications } = await import('@capacitor/push-notifications');
          const permStatus = await PushNotifications.checkPermissions();
          if (permStatus.receive === 'granted') {
            setNotificationPermission('granted');
          } else if (permStatus.receive === 'denied') {
            setNotificationPermission('denied');
          } else {
            setNotificationPermission('prompt');
          }
        } catch {
          setNotificationPermission('prompt');
        }
      } else {
        // Web: check browser notification permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
          setNotificationPermission(Notification.permission);
        } else {
          setNotificationPermission('unsupported');
          setIsChecking(false);
          return;
        }
      }

      // Get existing tokens
      try {
        const tokensSnapshot = await getDocs(
          collection(firestore, 'users', user.uid, 'fcmTokens')
        );
        const tokens = tokensSnapshot.docs.map(doc => doc.id);
        setFcmTokens(tokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
      }

      setIsChecking(false);
    };

    if (open && user && firestore) {
      checkStatus();
    }
  }, [open, user, firestore, isNative]);

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

  const requestPermission = async () => {
    if (!user || !firestore) {
      toast({
        title: 'Error',
        description: 'Firebase services are not ready. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    // Native path
    if (isNative) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const result = await PushNotifications.requestPermissions();

        if (result.receive === 'granted') {
          setNotificationPermission('granted');
          await PushNotifications.register();

          // Registration event will store the token via NotificationManager
          // Refresh token list after a short delay
          setTimeout(async () => {
            try {
              const tokensSnapshot = await getDocs(
                collection(firestore, 'users', user.uid, 'fcmTokens')
              );
              setFcmTokens(tokensSnapshot.docs.map(d => d.id));
            } catch {}
          }, 2000);

          if (typeof window !== 'undefined') {
            localStorage.removeItem('notification-prompt-dismissed');
          }

          toast({
            title: 'Notifications Enabled',
            description: "You'll now receive reminders and alerts from your circle.",
          });
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
      setIsLoading(false);
      return;
    }

    if (!messaging) {
      toast({
        title: 'Error',
        description: 'Firebase Messaging is not available. Check the browser console for details.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        try {
          if (!VAPID_KEY) {
            toast({
              title: 'Configuration Error',
              description: 'VAPID key is not configured.',
              variant: 'destructive',
            });
            return;
          }

          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

          if (currentToken) {
            const tokenRef = doc(firestore, 'users', user.uid, 'fcmTokens', currentToken);
            await setDoc(tokenRef, {
              token: currentToken,
              createdAt: serverTimestamp(),
            });

            const tokensSnapshot = await getDocs(
              collection(firestore, 'users', user.uid, 'fcmTokens')
            );
            setFcmTokens(tokensSnapshot.docs.map(d => d.id));

            if (typeof window !== 'undefined') {
              localStorage.removeItem('notification-prompt-dismissed');
            }

            toast({
              title: 'Notifications Enabled',
              description: "You'll now receive reminders and alerts from your circle.",
            });
          } else {
            toast({
              title: 'Error',
              description: 'Failed to get notification token. Please try again.',
              variant: 'destructive',
            });
          }
        } catch (err: any) {
          console.error('Error getting FCM token:', err);
          toast({
            title: 'Error',
            description: `Failed to enable notifications. ${err?.message || ''}`,
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
  };

  const removeToken = async (token: string) => {
    if (!user || !firestore) return;

    setIsLoading(true);
    try {
      const tokenRef = doc(firestore, 'users', user.uid, 'fcmTokens', token);
      await deleteDoc(tokenRef);

      const tokensSnapshot = await getDocs(
        collection(firestore, 'users', user.uid, 'fcmTokens')
      );
      setFcmTokens(tokensSnapshot.docs.map(d => d.id));

      toast({
        title: 'Token Removed',
        description: 'This device will no longer receive notifications.',
      });
    } catch (error) {
      console.error('Error removing token:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove token. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (isChecking) {
      return <Badge variant="secondary">Checking...</Badge>;
    }

    if (notificationPermission === 'granted' && fcmTokens.length > 0) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Enabled ({fcmTokens.length} device{fcmTokens.length !== 1 ? 's' : ''})
        </Badge>
      );
    }

    if (notificationPermission === 'denied') {
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      );
    }

    if (notificationPermission === 'unsupported') {
      return (
        <Badge variant="secondary">
          <AlertCircle className="h-3 w-3 mr-1" />
          Not Supported
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <BellOff className="h-3 w-3 mr-1" />
        Not Enabled
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </DialogTitle>
          <DialogDescription>
            Manage your push notification preferences. Enable notifications to receive reminders and alerts from your circle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Status</p>
              <p className="text-sm text-muted-foreground mt-1">
                {notificationPermission === 'granted' && fcmTokens.length > 0
                  ? 'You will receive push notifications on your enabled devices.'
                  : notificationPermission === 'denied'
                  ? isNative
                    ? 'Notifications are blocked. Enable them in Settings > FamShake > Notifications.'
                    : 'Notifications are blocked. Enable them in your browser settings.'
                  : notificationPermission === 'unsupported'
                  ? 'Push notifications are not supported in this environment.'
                  : 'Enable notifications to receive reminders and alerts.'}
              </p>
            </div>
            {getStatusBadge()}
          </div>

          {/* Enable/Disable Button */}
          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
            <Button
              onClick={requestPermission}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <Bell className="h-4 w-4 mr-2" />
              {notificationPermission === 'denied'
                ? isNative ? 'Open Settings' : 'Enable in Browser Settings'
                : 'Enable Notifications'}
            </Button>
          )}

          {/* Device Tokens */}
          {fcmTokens.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Registered Devices</p>
              <div className="space-y-2">
                {fcmTokens.map((token, index) => (
                  <div
                    key={token}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Device {index + 1}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {token.substring(0, 40)}...
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeToken(token)}
                      disabled={isLoading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Why enable notifications?</strong> You&apos;ll receive reminders when circle members check in, and gentle reminders if you haven&apos;t checked in today.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
