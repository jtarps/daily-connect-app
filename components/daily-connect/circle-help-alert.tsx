'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Loader, Users, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendNotOkayAlert } from '@/app/actions';
import type { Circle, User as UserType } from '@/lib/data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface CircleHelpAlertProps {
  circle: Circle;
}


export function CircleHelpAlert({ circle }: CircleHelpAlertProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');
  const [alertTarget, setAlertTarget] = useState<'circle' | 'person'>('circle');
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');

  // Get circle members (excluding current user)
  const otherMembers = useMemo(() => {
    return (circle.memberIds || []).filter(memberId => memberId !== user?.uid);
  }, [circle.memberIds, user?.uid]);

  // Store member names for display in select
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  // Fetch member names when dialog opens
  useEffect(() => {
    if (isOpen && firestore && otherMembers.length > 0) {
      Promise.all(
        otherMembers.map(async (memberId) => {
          try {
            const memberDocRef = doc(firestore, 'users', memberId);
            const memberDoc = await getDoc(memberDocRef);
            const memberData = memberDoc.data() as UserType | undefined;
            const memberName = memberData?.firstName && memberData?.lastName
              ? `${memberData.firstName} ${memberData.lastName.substring(0, 1)}.`
              : memberData?.firstName || memberId.substring(0, 8);
            return { memberId, memberName };
          } catch (error) {
            return { memberId, memberName: memberId.substring(0, 8) };
          }
        })
      ).then(results => {
        const names: Record<string, string> = {};
        results.forEach(({ memberId, memberName }) => {
          names[memberId] = memberName;
        });
        setMemberNames(names);
      });
    }
  }, [isOpen, firestore, otherMembers]);

  const handleSend = async () => {
    if (!user || !firestore) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send an alert.',
        variant: 'destructive',
      });
      return;
    }

    if (alertTarget === 'person' && !selectedPersonId) {
      toast({
        title: 'Error',
        description: 'Please select a person to alert.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Get user's name
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();
      const userName = userData?.firstName && userData?.lastName
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.firstName || 'Someone';

      let recipientId: string | undefined;
      let recipientName: string | undefined;

      if (alertTarget === 'person' && selectedPersonId) {
        // Get selected person's name
        const personDocRef = doc(firestore, 'users', selectedPersonId);
        const personDoc = await getDoc(personDocRef);
        const personData = personDoc.data() as UserType | undefined;
        recipientName = personData?.firstName && personData?.lastName
          ? `${personData.firstName} ${personData.lastName.substring(0, 1)}.`
          : personData?.firstName || 'Friend';
        recipientId = selectedPersonId;
      }

      const result = await sendNotOkayAlert({
        userId: user.uid,
        userName,
        circleId: alertTarget === 'circle' ? circle.id : undefined,
        recipientId,
        message: message.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: 'Alert Sent',
          description: result.message,
          variant: 'default',
        });
        setMessage('');
        setAlertTarget('circle');
        setSelectedPersonId('');
        setIsOpen(false);
      } else {
        toast({
          title: 'Failed to Send Alert',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to send not okay alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to send alert. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="I need help">
          <AlertTriangle className="h-4 w-4" />
          <span className="sr-only">I need help</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            I Need Help
          </DialogTitle>
          <DialogDescription>
            Send a discreet alert to your circle or a specific person.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Send to</Label>
            <Select
              value={alertTarget}
              onValueChange={(value) => {
                setAlertTarget(value as 'circle' | 'person');
                if (value === 'circle') {
                  setSelectedPersonId('');
                }
              }}
              disabled={isSending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Whole Circle ({circle.name})</span>
                  </div>
                </SelectItem>
                <SelectItem value="person" disabled={otherMembers.length === 0}>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Specific Person</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {alertTarget === 'person' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Person</Label>
              <Select
                value={selectedPersonId}
                onValueChange={setSelectedPersonId}
                disabled={isSending || otherMembers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a person..." />
                </SelectTrigger>
                <SelectContent>
                  {otherMembers.map((memberId) => (
                    <SelectItem key={memberId} value={memberId}>
                      {memberNames[memberId] || memberId.substring(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Optional Message</Label>
            <Textarea
              placeholder="Add a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              maxLength={200}
              rows={3}
            />
            <span className="text-xs text-muted-foreground">
              {message.length}/200
            </span>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={isSending || (alertTarget === 'person' && !selectedPersonId)}
              variant="destructive"
            >
              {isSending ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Send Alert
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
