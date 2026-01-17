'use client';

import { useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Phone, Mail, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User, EmergencyContact } from '@/lib/data';
import { Loader } from 'lucide-react';

interface EmergencyContactSettingsProps {
  children?: React.ReactNode;
}

export function EmergencyContactSettings({ children }: EmergencyContactSettingsProps = {}) {
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
  const emergencyContact = userData?.emergencyContact;
  const emergencyAlertEnabled = userData?.emergencyAlertEnabled || false;

  const [formData, setFormData] = useState<EmergencyContact>({
    name: '',
    email: '',
    phoneNumber: '',
    relationship: '',
  });
  const [enabled, setEnabled] = useState(false);

  // Update form when userData changes
  useEffect(() => {
    if (userData?.emergencyContact) {
      setFormData(userData.emergencyContact);
    }
    if (userData?.emergencyAlertEnabled !== undefined) {
      setEnabled(userData.emergencyAlertEnabled);
    }
  }, [userData]);

  const handleSave = async () => {
    if (!user || !userDocRef) return;

    // Validate required fields if enabled
    if (enabled && !formData.name) {
      toast({
        title: 'Validation Error',
        description: 'Emergency contact name is required when alerts are enabled.',
        variant: 'destructive',
      });
      return;
    }

    if (enabled && !formData.email && !formData.phoneNumber) {
      toast({
        title: 'Validation Error',
        description: 'At least one contact method (email or phone) is required when alerts are enabled.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        emergencyAlertEnabled: enabled,
      };

      if (enabled && formData.name) {
        updateData.emergencyContact = {
          name: formData.name.trim(),
          email: formData.email?.trim() || undefined,
          phoneNumber: formData.phoneNumber?.trim() || undefined,
          relationship: formData.relationship?.trim() || undefined,
        };
      } else {
        // Clear emergency contact if disabled
        updateData.emergencyContact = null;
      }

      await updateDoc(userDocRef, updateData);

      toast({
        title: 'Settings Updated',
        description: enabled
          ? 'Emergency contact saved. You will be notified if you miss check-ins for 2+ days.'
          : 'Emergency alerts disabled.',
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update emergency contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to save emergency contact. Please try again.',
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
          <Button variant="ghost" size="icon" aria-label="Emergency Contact Settings">
            <AlertTriangle className="h-5 w-5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Emergency Contact</DialogTitle>
          <DialogDescription>
            Set up an emergency contact to be notified if you haven&apos;t checked in for 2+ days.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="emergency-enabled" className="text-sm font-medium">
                Enable Emergency Alerts
              </Label>
              <p className="text-xs text-muted-foreground">
                Notify emergency contact and circle members if you miss check-ins for 2+ days
              </p>
            </div>
            <Switch
              id="emergency-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={isSaving}
            />
          </div>

          {enabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergency-name" className="text-sm font-medium flex items-center gap-2">
                  <UserIcon className="h-4 w-4" />
                  Contact Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="emergency-name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-relationship" className="text-sm font-medium">
                  Relationship (Optional)
                </Label>
                <Input
                  id="emergency-relationship"
                  placeholder="e.g., Spouse, Parent, Friend"
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="emergency-email"
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency-phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Number
                </Label>
                <Input
                  id="emergency-phone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  disabled={isSaving}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                <span className="text-destructive">*</span> At least one contact method (email or phone) is required.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
