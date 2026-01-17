'use client';

import { useState } from 'react';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { User, CheckInInterval } from '@/lib/data';
import { CHECK_IN_INTERVALS, getDefaultInterval } from '@/lib/check-in-intervals';
import { EmergencyContactSettings } from './emergency-contact-settings';

interface CheckInIntervalSettingsProps {
  children?: React.ReactNode;
}

export function CheckInIntervalSettings({ children }: CheckInIntervalSettingsProps = {}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userData } = useDoc<User>(userDocRef);
  const currentInterval = userData?.checkInInterval || getDefaultInterval();
  const customHours = userData?.customCheckInHours || 24;
  const notifyCircle = userData?.notifyCircleOnCheckIn !== false; // Default to true

  const handleIntervalChange = async (newInterval: CheckInInterval) => {
    if (!user || !userDocRef || newInterval === currentInterval) return;

    setIsSaving(true);
    try {
      const updateData: any = { checkInInterval: newInterval };
      
      // Clear custom hours if not using custom interval
      if (newInterval !== 'custom') {
        updateData.customCheckInHours = null;
      } else if (!userData?.customCheckInHours) {
        // Set default custom hours if switching to custom
        updateData.customCheckInHours = 24;
      }

      await updateDoc(userDocRef, updateData);

      const label = newInterval === 'custom' 
        ? `Custom (${userData?.customCheckInHours || 24} hours)`
        : CHECK_IN_INTERVALS[newInterval].label.toLowerCase();
      
      toast({
        title: 'Settings Updated',
        description: `Check-in interval changed to ${label}.`,
      });
    } catch (error) {
      console.error('Failed to update check-in interval:', error);
      toast({
        title: 'Error',
        description: 'Failed to update check-in interval. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomHoursChange = async (hours: number) => {
    if (!user || !userDocRef || currentInterval !== 'custom') return;
    
    const clampedHours = Math.max(1, Math.min(168, Math.round(hours)));
    if (clampedHours === customHours) return;

    setIsSaving(true);
    try {
      await updateDoc(userDocRef, {
        customCheckInHours: clampedHours,
      });

      toast({
        title: 'Settings Updated',
        description: `Custom interval set to ${clampedHours} hour${clampedHours !== 1 ? 's' : ''}.`,
      });
    } catch (error) {
      console.error('Failed to update custom hours:', error);
      toast({
        title: 'Error',
        description: 'Failed to update custom interval. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotifyCircleChange = async (enabled: boolean) => {
    if (!user || !userDocRef) return;

    setIsSaving(true);
    try {
      await updateDoc(userDocRef, {
        notifyCircleOnCheckIn: enabled,
      });

      toast({
        title: 'Settings Updated',
        description: enabled 
          ? 'Your circle will be notified when you check in.'
          : 'Your circle will not be notified when you check in.',
      });
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification setting. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" aria-label="Check-in Settings">
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check-in Settings</DialogTitle>
          <DialogDescription>
            Configure your check-in preferences and notifications.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Check-in Frequency</Label>
            <Select
              value={currentInterval}
              onValueChange={(value) => handleIntervalChange(value as CheckInInterval)}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHECK_IN_INTERVALS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {config.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="custom">
                  <div>
                    <div className="font-medium">Custom</div>
                    <div className="text-xs text-muted-foreground">
                      Set your own interval (1-168 hours)
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {currentInterval === 'custom' && (
              <div className="space-y-2 mt-3">
                <Label htmlFor="custom-hours" className="text-sm font-medium">
                  Hours Between Check-ins
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="custom-hours"
                    type="number"
                    min="1"
                    max="168"
                    value={customHours}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 24;
                      handleCustomHoursChange(value);
                    }}
                    disabled={isSaving}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">hours (1-168)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can check in once every {customHours} hour{customHours !== 1 ? 's' : ''}.
                </p>
              </div>
            )}
            {currentInterval !== 'custom' && CHECK_IN_INTERVALS[currentInterval] && (
              <p className="text-xs text-muted-foreground mt-1">
                Current: <strong>{CHECK_IN_INTERVALS[currentInterval].label}</strong> - {CHECK_IN_INTERVALS[currentInterval].description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="notify-circle" className="text-sm font-medium">
                Notify Circle on Check-in
              </Label>
              <p className="text-xs text-muted-foreground">
                Send a notification to your circle members when you check in
              </p>
            </div>
            <Switch
              id="notify-circle"
              checked={notifyCircle}
              onCheckedChange={handleNotifyCircleChange}
              disabled={isSaving}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium">Emergency Contact</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Set up an emergency contact to be notified if you miss check-ins for 2+ days.
            </p>
            <EmergencyContactSettings>
              <Button variant="outline" className="w-full" disabled={isSaving}>
                Configure Emergency Contact
              </Button>
            </EmergencyContactSettings>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

