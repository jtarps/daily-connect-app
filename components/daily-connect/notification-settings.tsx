'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase/provider';
import { doc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bell, BellOff, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '../ui/badge';

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationSettings({ open, onOpenChange }: NotificationSettingsProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<string>('prompt');
  const [fcmTokens, setFcmTokens] = useState<{ id: string; type?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check permission status and existing tokens
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || !firestore) return;

      setIsChecking(true);

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

      // Get existing tokens
      try {
        const tokensSnapshot = await getDocs(
          collection(firestore, 'users', user.uid, 'fcmTokens')
        );
        const tokens = tokensSnapshot.docs.map(d => ({ id: d.id, type: d.data().type }));
        setFcmTokens(tokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
      }

      setIsChecking(false);
    };

    if (open && user && firestore) {
      checkStatus();
    }
  }, [open, user, firestore]);

  const requestPermission = async () => {
    if (!user || !firestore) return;

    setIsLoading(true);
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const result = await PushNotifications.requestPermissions();

      if (result.receive === 'granted') {
        setNotificationPermission('granted');
        await PushNotifications.register();

        // Refresh token list after registration
        setTimeout(async () => {
          try {
            const tokensSnapshot = await getDocs(
              collection(firestore, 'users', user.uid, 'fcmTokens')
            );
            setFcmTokens(tokensSnapshot.docs.map(d => ({ id: d.id, type: d.data().type })));
          } catch {}
        }, 2000);

        localStorage.removeItem('notification-prompt-dismissed');

        toast({
          title: 'Notifications Enabled',
          description: "You'll now receive reminders and alerts from your circle.",
        });
      } else {
        setNotificationPermission('denied');
        toast({
          title: 'Notifications Blocked',
          description: 'Enable notifications in Settings > FamShake > Notifications.',
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
      setFcmTokens(tokensSnapshot.docs.map(d => ({ id: d.id, type: d.data().type })));

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
                  ? 'You will receive push notifications on this device.'
                  : notificationPermission === 'denied'
                  ? 'Notifications are blocked. Enable them in Settings > FamShake > Notifications.'
                  : 'Enable notifications to receive reminders and alerts.'}
              </p>
            </div>
            {getStatusBadge()}
          </div>

          {/* Enable/Disable Button */}
          {notificationPermission !== 'granted' && (
            <Button
              onClick={requestPermission}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <Bell className="h-4 w-4 mr-2" />
              {notificationPermission === 'denied'
                ? 'Open Settings'
                : 'Enable Notifications'}
            </Button>
          )}

          {/* Re-register button: permission granted but no tokens saved */}
          {notificationPermission === 'granted' && fcmTokens.length === 0 && !isChecking && (
            <Button
              onClick={requestPermission}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <Bell className="h-4 w-4 mr-2" />
              {isLoading ? 'Registering...' : 'Register This Device'}
            </Button>
          )}

          {/* Device Tokens */}
          {fcmTokens.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Registered Devices</p>
              <div className="space-y-2">
                {fcmTokens.map((token, index) => (
                  <div
                    key={token.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Device {index + 1}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ({token.type === 'apns' ? 'iOS Native' : 'Web'})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {token.id.substring(0, 30)}...
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeToken(token.id)}
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
