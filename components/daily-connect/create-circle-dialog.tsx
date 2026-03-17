
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Trash2, Share2, Copy, Check, Link, UserPlus, Mail, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Circle } from '@/lib/data';
import { APP_STORE_URL } from '@/lib/constants';
import { addMemberToCircle } from '@/app/actions';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


interface CircleManagerDialogProps {
  children?: React.ReactNode;
  circle?: Circle;
  mode: 'create' | 'edit';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CircleManagerDialog({ children, circle, mode, open: controlledOpen, onOpenChange }: CircleManagerDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [circleName, setCircleName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteContact, setInviteContact] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const isEditMode = mode === 'edit';
  const isOwner = isEditMode && circle && user?.uid === circle.ownerId;

  const generateShareLink = useCallback(async (circleId: string, circleNameForInvite?: string) => {
    if (!firestore || !user) return;

    try {
      const token = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      const invitationData = {
        circleId: circleId,
        circleName: circleNameForInvite || circle?.name || '',
        inviterId: user.uid,
        invitationToken: token,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
      };

      const invitationsRef = collection(firestore, 'invitations');
      await addDoc(invitationsRef, invitationData);

      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const inviteLink = `${baseUrl}/invite/${token}`;
      setShareLink(inviteLink);
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: 'Error',
        description: 'Could not generate share link. Please try again.',
        variant: 'destructive',
      });
    }
  }, [firestore, user, circle, toast]);

  useEffect(() => {
    if (open) {
      if (isEditMode && circle) {
        setCircleName(circle.name);
        if (firestore && user) {
          generateShareLink(circle.id);
        }
      } else {
        setCircleName('');
        setShareLink(null);
      }
    }
  }, [circle, isEditMode, open, firestore, user, generateShareLink]);

  const getShareMessage = () => {
    const circleLbl = circle?.name || circleName;
    if (APP_STORE_URL) {
      return `Join my circle "${circleLbl}" on FamShake!\n\nDownload the app: ${APP_STORE_URL}\n\nOnce you've signed up, open this link in the app to join: ${shareLink}`;
    }
    return `You're invited to join "${circleLbl}" on FamShake! ${shareLink}`;
  };

  const copyShareLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(getShareMessage());
      setLinkCopied(true);
      toast({
        title: 'Link Copied!',
        description: 'Share this with your friends and family.',
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not copy link. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const shareViaNative = async () => {
    if (!shareLink) return;

    const circleLbl = circle?.name || circleName;
    const shareData = {
      title: `Join ${circleLbl} on FamShake`,
      text: getShareMessage(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await copyShareLink();
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  const handleInviteByContact = async () => {
    if (!user || !circle) return;
    const value = inviteContact.trim();
    if (!value) return;

    const isEmail = value.includes('@');
    const isPhone = /^\+?\d{7,15}$/.test(value.replace(/[\s\-()]/g, ''));

    if (!isEmail && !isPhone) {
      toast({
        variant: 'destructive',
        title: 'Invalid input',
        description: 'Please enter a valid email address or phone number.',
      });
      return;
    }

    setIsSendingInvite(true);
    try {
      const result = await addMemberToCircle({
        contact: value,
        circleId: circle.id,
        circleName: circle.name,
        inviterId: user.uid,
      });

      if (result.success) {
        toast({ title: result.added ? 'Member Added!' : 'Invitation Sent!', description: result.message });
        setInviteContact('');
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    } catch (error) {
      console.error('Error inviting contact:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not send invitation. Please try again.',
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleSaveCircle = async () => {
    if (!user) {
        toast({ title: "You must be logged in.", variant: 'destructive' });
        return;
    }
    if (!circleName.trim()) {
        toast({ title: "Circle name is required.", variant: 'destructive' });
        return;
    }
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not available. Please refresh the page.' });
        return;
    }

    setIsSaving(true);

    try {
        if (isEditMode && circle) {
            const circleRef = doc(firestore, 'circles', circle.id);
            if (circle.name !== circleName) {
                await updateDoc(circleRef, { name: circleName }).catch(async () => {
                     const permissionError = new FirestorePermissionError({
                        path: circleRef.path,
                        operation: 'update',
                        requestResourceData: { name: circleName },
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw permissionError;
                });
                toast({ title: "Circle name updated." });
            }
            setOpen(false);
        } else {
            const circleData = {
                name: circleName,
                ownerId: user.uid,
                memberIds: [user.uid],
            };

            const circleRef = await addDoc(collection(firestore, 'circles'), circleData).catch(async () => {
                const permissionError = new FirestorePermissionError({
                    path: 'circles',
                    operation: 'create',
                    requestResourceData: circleData,
                });
                errorEmitter.emit('permission-error', permissionError);
                throw permissionError;
            });

            toast({
                title: "Circle Created!",
                description: `Your circle "${circleName}" has been created.`
            });

            generateShareLink(circleRef.id, circleName);
            setOpen(false);
        }
    } catch (error) {
        console.error("Error saving circle: ", error);
        toast({
            title: "An error occurred",
            description: "Could not save your circle. Please check the console for details.",
            variant: 'destructive',
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteCircle = async () => {
    if (!circle || !user || !firestore) return;

    if (user.uid !== circle.ownerId) {
      toast({
        title: "Permission Denied",
        description: "Only the circle owner can delete this circle.",
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      const circleRef = doc(firestore, 'circles', circle.id);
      await deleteDoc(circleRef).catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: circleRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
      });

      toast({
        title: "Circle Deleted",
        description: `"${circle.name}" has been deleted.`,
      });
      setOpen(false);
    } catch (error) {
      console.error("Error deleting circle: ", error);
      toast({
        title: "Error",
        description: "Could not delete the circle. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isControlled = controlledOpen !== undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && children && (
        <DialogTrigger asChild>{children}</DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[440px] max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{isEditMode ? 'Manage Circle' : 'Create Circle'}</DialogTitle>
          <DialogDescription>
            {isEditMode
                ? 'Update circle settings or invite new members.'
                : 'Give your circle a name to get started.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 space-y-4">
          {/* Circle Name */}
          <div className="space-y-2">
            <Label htmlFor="circle-name">Circle name</Label>
            <Input
              id="circle-name"
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              placeholder="e.g., Family, Book Club"
              autoFocus
              disabled={isSaving || isDeleting}
            />
          </div>

          {/* Invite by email or phone — edit mode */}
          {isEditMode && circle && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Add member</Label>
              </div>
              <div className="flex gap-2">
                <Input
                  value={inviteContact}
                  onChange={(e) => setInviteContact(e.target.value)}
                  placeholder="Email or phone number"
                  className="h-9 text-sm"
                  disabled={isSendingInvite}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleInviteByContact();
                    }
                  }}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleInviteByContact}
                  disabled={isSendingInvite || !inviteContact.trim()}
                  className="shrink-0"
                >
                  {isSendingInvite ? 'Adding...' : 'Add'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                If they&apos;re already on FamShake, they&apos;ll be added instantly. Otherwise, they&apos;ll see the invite when they sign up.
              </p>
            </div>
          )}

          {/* Share Invite — edit mode */}
          {isEditMode && circle && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Share invite</Label>
              </div>
              {shareLink ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShareLink}
                      className="flex-1 gap-2"
                    >
                      {linkCopied ? (
                        <><Check className="h-4 w-4" /> Copied</>
                      ) : (
                        <><Copy className="h-4 w-4" /> Copy Invite</>
                      )}
                    </Button>
                    {typeof window !== 'undefined' && 'share' in navigator && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={shareViaNative}
                        className="flex-1 gap-2"
                      >
                        <Share2 className="h-4 w-4" /> Share
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sends an invite with the App Store download link.
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateShareLink(circle.id)}
                  className="w-full gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Generate Invite Link
                </Button>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t mt-2 flex items-center gap-2">
          {isEditMode && isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting || isSaving}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this circle?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &quot;{circle?.name}&quot; and remove all members. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteCircle}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {!isOwner && !isEditMode && <div className="mr-auto" />}
          {isEditMode && !isOwner && <div className="mr-auto" />}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isSaving || isDeleting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSaveCircle}
            disabled={isSaving || isDeleting}
          >
            {isSaving ? 'Saving...' : (isEditMode ? 'Save' : 'Create Circle')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
