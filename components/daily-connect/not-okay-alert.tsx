'use client';

import { useState } from 'react';
import { useFirestore, useUser } from '@/firebase/provider';
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
import { AlertTriangle, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendNotOkayAlert } from '@/app/actions';
import { cn } from '@/lib/utils';

interface NotOkayAlertProps {
  circleId?: string; // If provided, alert goes to circle. If not, alert goes to all circles
  recipientId?: string; // If provided, alert goes to specific person instead of circle
  recipientName?: string; // Name of recipient for display
  variant?: 'default' | 'subtle';
  className?: string;
}

export function NotOkayAlert({ 
  circleId, 
  recipientId, 
  recipientName,
  variant = 'subtle',
  className 
}: NotOkayAlertProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!user || !firestore) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send an alert.',
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

      const result = await sendNotOkayAlert({
        userId: user.uid,
        userName,
        circleId: circleId || undefined,
        recipientId: recipientId || undefined,
        message: message.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: 'Alert Sent',
          description: result.message,
          variant: 'default',
        });
        setMessage('');
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

  const alertTarget = recipientId && recipientName
    ? recipientName
    : circleId
    ? 'your circle'
    : 'all your circles';

  if (variant === 'subtle') {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("text-muted-foreground hover:text-destructive", className)}
          >
            <AlertTriangle className="h-4 w-4 mr-1" />
            <span className="text-xs">Need Help</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              I Need Help
            </DialogTitle>
            <DialogDescription>
              Send a discreet alert to {alertTarget}. They&apos;ll be notified immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Optional: Add a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSending}
              maxLength={200}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {message.length}/200
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSending}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSend} 
                  disabled={isSending}
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
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Default variant - more prominent
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className={cn("border-destructive/50 text-destructive hover:bg-destructive/10", className)}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          I Need Help
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            I Need Help
          </DialogTitle>
          <DialogDescription>
            Send an alert to {alertTarget}. They&apos;ll be notified immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Optional: Add a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
            maxLength={200}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {message.length}/200
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSending}>
                Cancel
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={isSending}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
