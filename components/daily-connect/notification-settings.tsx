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
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'prompt' | 'unsupported'>('prompt');
  const [fcmTokens, setFcmTokens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check permission status and existing tokens
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || !firestore) return;

      setIsChecking(true);

      // Check if we're in a native Capacitor app
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        setNotificationPermission('unsupported');
        setIsChecking(false);
        return;
      }

      // Check browser notification permission
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationPermission(Notification.permission);
      } else {
        setNotificationPermission('unsupported');
        setIsChecking(false);
        return;
      }

      // Get existing FCM tokens
      try {
        const tokensSnapshot = await getDocs(
          collection(firestore, 'users', user.uid, 'fcmTokens')
        );
        const tokens = tokensSnapshot.docs.map(doc => doc.id);
        setFcmTokens(tokens);
      } catch (error) {
        console.error('Error fetching FCM tokens:', error);
      }

      setIsChecking(false);
    };

    if (open && user && firestore) {
      checkStatus();
    }
  }, [open, user, firestore]);

  // Listen for foreground messages
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

  const requestPermission = async () => {
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

    if (!messaging) {
      console.error('Firebase Messaging is not initialized');
      toast({
        title: 'Error',
        description: 'Firebase Messaging is not available. The service worker may not be registered. Check the browser console for details.',
        variant: 'destructive',
      });
      return;
    }

    if (!user || !firestore) {
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
          // Check if VAPID key is set
          if (!VAPID_KEY || VAPID_KEY === 'YOUR_VAPID_KEY_HERE') {
            console.error('VAPID_KEY is not set or is placeholder');
            toast({
              title: 'Configuration Error',
              description: 'VAPID key is not configured. Please check your environment variables.',
              variant: 'destructive',
            });
            return;
          }

          console.log('Requesting FCM token with VAPID key:', VAPID_KEY.substring(0, 20) + '...');
          const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
          
          if (currentToken) {
            console.log('FCM Token received:', currentToken);
            // Save the token to Firestore
            const tokenRef = doc(firestore, 'users', user.uid, 'fcmTokens', currentToken);
            await setDoc(tokenRef, {
              token: currentToken,
              createdAt: serverTimestamp(),
            });

            // Refresh token list
            const tokensSnapshot = await getDocs(
              collection(firestore, 'users', user.uid, 'fcmTokens')
            );
            const tokens = tokensSnapshot.docs.map(doc => doc.id);
            setFcmTokens(tokens);

            // Clear dismissal flag so prompt can show again if needed
            if (typeof window !== 'undefined') {
              localStorage.removeItem('notification-prompt-dismissed');
            }

            toast({
              title: 'Notifications Enabled',
              description: 'You\'ll now receive reminders and alerts from your circle.',
            });
          } else {
            console.error('getToken returned null or empty string');
            toast({
              title: 'Error',
              description: 'Failed to get notification token. The service worker may not be registered. Check the browser console for details.',
              variant: 'destructive',
            });
          }
        } catch (err: any) {
          console.error('Error getting token:', err);
          const errorMessage = err?.message || 'Unknown error';
          console.error('Error details:', {
            code: err?.code,
            message: errorMessage,
            stack: err?.stack,
          });
          
          // Provide more specific error messages
          let userMessage = 'Failed to enable notifications. ';
          if (errorMessage.includes('messaging/unsupported-browser')) {
            userMessage += 'Your browser does not support push notifications.';
          } else if (errorMessage.includes('messaging/invalid-vapid-key')) {
            userMessage += 'Invalid VAPID key. Please check your environment variables.';
          } else if (errorMessage.includes('messaging/token-subscription-failed')) {
            userMessage += 'Failed to subscribe to notifications. The service worker may not be registered.';
          } else {
            userMessage += `Error: ${errorMessage}`;
          }
          
          toast({
            title: 'Error',
            description: userMessage,
            variant: 'destructive',
          });
        }
      } else if (permission === 'denied') {
        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings, then try again.',
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

      // Refresh token list
      const tokensSnapshot = await getDocs(
        collection(firestore, 'users', user.uid, 'fcmTokens')
      );
      const tokens = tokensSnapshot.docs.map(doc => doc.id);
      setFcmTokens(tokens);

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
      const isNative = Capacitor.isNativePlatform();
      return (
        <Badge variant="secondary">
          <AlertCircle className="h-3 w-3 mr-1" />
          {isNative ? 'Native App' : 'Not Supported'}
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
                  ? 'Notifications are blocked. Enable them in your browser settings.'
                  : notificationPermission === 'unsupported'
                  ? Capacitor.isNativePlatform()
                    ? 'Web push notifications don\'t work in native apps. Use the browser or PWA version to enable notifications.'
                    : 'Push notifications are not supported in this environment.'
                  : 'Enable notifications to receive reminders and alerts.'}
              </p>
            </div>
            {getStatusBadge()}
          </div>

          {/* Enable/Disable Button */}
          {notificationPermission !== 'granted' && (
            <Button
              onClick={requestPermission}
              disabled={isLoading || notificationPermission === 'unsupported'}
              className="w-full"
              size="lg"
            >
              {notificationPermission === 'denied' ? (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable in Browser Settings
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </>
              )}
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

