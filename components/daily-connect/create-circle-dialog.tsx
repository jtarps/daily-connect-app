
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, UserPlus, Trash2, Share2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Circle } from '@/lib/data';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { sendInvitationEmail, sendInvitationSMS, sendInvitationWhatsApp } from '@/app/actions';
import type { User } from '@/lib/data';
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
  children: React.ReactNode;
  circle?: Circle; 
  mode: 'create' | 'edit';
}

export function CircleManagerDialog({ children, circle, mode }: CircleManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [membersToInvite, setMembersToInvite] = useState<string[]>(['']);
  const [phonesToInvite, setPhonesToInvite] = useState<string[]>(['']);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const isEditMode = mode === 'edit';
  const isOwner = isEditMode && circle && user?.uid === circle.ownerId;

  const generateShareLink = useCallback(async (circleId: string) => {
    if (!firestore || !user) return;
    
    try {
      // Generate a unique token for this invitation
      const token = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Create a link-based invitation
      const invitationData = {
        circleId: circleId,
        circleName: circle?.name || circleName,
        inviterId: user.uid,
        invitationToken: token,
        status: 'pending' as const,
        createdAt: serverTimestamp(),
      };

      const invitationsRef = collection(firestore, 'invitations');
      await addDoc(invitationsRef, invitationData);
      
      // Generate the shareable link
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
  }, [firestore, user, circle, circleName, toast]);

  useEffect(() => {
    if (open) {
      if (isEditMode && circle) {
        setCircleName(circle.name);
        setMembersToInvite(['']);
        setPhonesToInvite(['']);
        // Generate share link for existing circle
        if (firestore && user) {
          generateShareLink(circle.id);
        }
      } else {
        setCircleName('');
        setMembersToInvite(['']);
        setPhonesToInvite(['']);
        setShareLink(null);
      }
    }
  }, [circle, isEditMode, open, firestore, user, generateShareLink]);

  const copyShareLink = async () => {
    if (!shareLink) return;
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      toast({
        title: 'Link Copied!',
        description: 'Share this link via WhatsApp, SMS, or any messaging app.',
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
    if (!shareLink || !circle) return;
    
    const shareData = {
      title: `Join ${circle.name || circleName} on Daily Connect`,
      text: `${user?.email || 'Someone'} invited you to join "${circle.name || circleName}" on Daily Connect. Click the link to join!`,
      url: shareLink,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await copyShareLink();
      }
    } catch (error) {
      // User cancelled or error occurred
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };


  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...membersToInvite];
    newMembers[index] = value;
    setMembersToInvite(newMembers);
  };

  const addMemberInput = () => {
    setMembersToInvite([...membersToInvite, '']);
  };

  const removeMemberInput = (index: number) => {
    const newMembers = membersToInvite.filter((_, i) => i !== index);
    if (newMembers.length === 0) {
        setMembersToInvite(['']);
    } else {
        setMembersToInvite(newMembers);
    }
  };

  const handlePhoneChange = (index: number, value: string) => {
    const newPhones = [...phonesToInvite];
    newPhones[index] = value;
    setPhonesToInvite(newPhones);
  };

  const addPhoneInput = () => {
    setPhonesToInvite([...phonesToInvite, '']);
  };

  const removePhoneInput = (index: number) => {
    const newPhones = phonesToInvite.filter((_, i) => i !== index);
    if (newPhones.length === 0) {
        setPhonesToInvite(['']);
    } else {
        setPhonesToInvite(newPhones);
    }
  };

  const sendInvitations = async (circleId: string, currentCircleName: string) => {
    if (!user || !firestore) return;
    const inviterId = user.uid;
    const emailsToInvite = membersToInvite.map(m => m.trim()).filter(m => m.length > 0 && m.includes('@'));
    const phonesToInviteFiltered = phonesToInvite.map(p => p.trim()).filter(p => {
      // Basic phone validation - should have at least 10 digits and start with +
      const cleaned = p.replace(/\D/g, '');
      return cleaned.length >= 10 && p.startsWith('+');
    });

    if (emailsToInvite.length === 0 && phonesToInviteFiltered.length === 0) {
        toast({ title: "No new members to invite.", description: "Enter at least one valid email address or phone number."});
        return;
    };
    
    const invitationsRef = collection(firestore, 'invitations');
    let invitesSent = 0;
    let emailsSent = 0;

    // Get inviter's name for notifications
    let inviterName = user.email || user.phoneNumber || 'Someone';
    try {
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        inviterName = userData.firstName && userData.lastName 
          ? `${userData.firstName} ${userData.lastName}`
          : inviterName;
      }
    } catch (error) {
      console.error('Error fetching inviter name:', error);
    }

    // Send email invitations
    for (const email of emailsToInvite) {
        try {
            const invitationData = {
                circleId: circleId,
                circleName: currentCircleName,
                inviterId: inviterId,
                inviteeEmail: email,
                status: 'pending' as const,
                createdAt: serverTimestamp(),
            };

            // Create invitation in Firestore
            await addDoc(invitationsRef, invitationData);
            invitesSent++;

            // Send email notification
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const signupLink = `${baseUrl}/signup`;
            
            const emailResult = await sendInvitationEmail({
                inviteeEmail: email,
                circleName: currentCircleName,
                inviterName: inviterName,
                invitationLink: signupLink,
            });

            if (emailResult.success) {
                emailsSent++;
            }
        } catch (error) {
            console.error(`Error sending invitation to ${email}:`, error);
            const permissionError = new FirestorePermissionError({
                path: 'invitations',
                operation: 'create',
                requestResourceData: { circleId, inviteeEmail: email },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    }

    // Send phone invitations
    let smsSent = 0;
    let whatsappSent = 0;
    for (const phone of phonesToInviteFiltered) {
        try {
            // Format phone number (ensure it starts with +)
            const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
            
            const invitationData = {
                circleId: circleId,
                circleName: currentCircleName,
                inviterId: inviterId,
                inviteePhone: formattedPhone,
                status: 'pending' as const,
                createdAt: serverTimestamp(),
            };

            // Create invitation in Firestore
            await addDoc(invitationsRef, invitationData);
            invitesSent++;

            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            const signupLink = `${baseUrl}/signup`;

            // Try WhatsApp first (much cheaper - $0.0014 vs $0.06 for SMS)
            const whatsappResult = await sendInvitationWhatsApp({
                inviteePhone: formattedPhone,
                circleName: currentCircleName,
                inviterName: inviterName,
                invitationLink: signupLink,
            });

            if (whatsappResult.success) {
                whatsappSent++;
            } else {
                // Fallback to SMS if WhatsApp fails
                const smsResult = await sendInvitationSMS({
                    inviteePhone: formattedPhone,
                    circleName: currentCircleName,
                    inviterName: inviterName,
                    invitationLink: signupLink,
                });

                if (smsResult.success) {
                    smsSent++;
                }
            }
        } catch (error) {
            console.error(`Error sending invitation to ${phone}:`, error);
            const permissionError = new FirestorePermissionError({
                path: 'invitations',
                operation: 'create',
                requestResourceData: { circleId, inviteePhone: phone },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    }

    const notificationSummary = [];
    if (emailsSent > 0) notificationSummary.push(`${emailsSent} email(s)`);
    if (whatsappSent > 0) notificationSummary.push(`${whatsappSent} WhatsApp(s)`);
    if (smsSent > 0) notificationSummary.push(`${smsSent} SMS(s)`);
    const notificationText = notificationSummary.length > 0 
        ? ` and sent ${notificationSummary.join(', ')}` 
        : '';

    toast({
        title: "Invitations Sent",
        description: `Created ${invitesSent} invitation(s)${notificationText}.`,
    });
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
    
    setIsSaving(true);

    try {
        if (isEditMode && circle) {
            // EDIT MODE
            if (!firestore) {
                toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not available. Please refresh the page.' });
                return;
            }
            const circleRef = doc(firestore, 'circles', circle.id);
            if (circle.name !== circleName) {
                await updateDoc(circleRef, { name: circleName }).catch(async (serverError) => {
                     const permissionError = new FirestorePermissionError({
                        path: circleRef.path,
                        operation: 'update',
                        requestResourceData: { name: circleName },
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw permissionError; // Stop execution if name update fails
                });
                toast({ title: "Circle name updated." });
            }
            await sendInvitations(circle.id, circleName);

        } else {
            // CREATE MODE
            const circleData = {
                name: circleName,
                ownerId: user.uid,
                memberIds: [user.uid], // Start with just the owner
            };

            if (!firestore) {
                toast({ variant: 'destructive', title: 'Error', description: 'Firebase is not available. Please refresh the page.' });
                return;
            }
            const circleRef = await addDoc(collection(firestore, 'circles'), circleData).catch(async (serverError) => {
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

            await sendInvitations(circleRef.id, circleName);
            // Generate share link for new circle
            generateShareLink(circleRef.id);
        }
        setOpen(false);
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
      await deleteDoc(circleRef).catch(async (serverError) => {
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Manage Circle' : 'Create a New Circle'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
                ? `Editing "${circle?.name}". Invite members by email or share a link via WhatsApp, SMS, or any messaging app.`
                : 'Give your circle a name and invite members by email or share a link.'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Family, Book Club"
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2 flex gap-1 items-center justify-end">
                <UserPlus className="h-4 w-4" />
                Invite
            </Label>
            <div className="col-span-3 space-y-4">
                {/* Share Link Section */}
                {isEditMode && circle && (
                  <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Share Invitation Link
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Share this link via WhatsApp, SMS, Facebook Messenger, or any messaging app. Works for anyone, even without email!
                    </p>
                    {shareLink ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={shareLink}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyShareLink}
                          className="gap-2"
                        >
                          {linkCopied ? (
                            <>
                              <Check className="h-4 w-4" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              Copy
                            </>
                          )}
                        </Button>
                        {typeof window !== 'undefined' && 'share' in navigator && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={shareViaNative}
                            className="gap-2"
                          >
                            <Share2 className="h-4 w-4" />
                            Share
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateShareLink(circle.id)}
                        className="w-full gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        Generate Share Link
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Email Invitation Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Or invite by email</Label>
                  <p className="text-xs text-muted-foreground">Invite new members to this circle by email. If they don&apos;t have an account, they&apos;ll be prompted to create one.</p>
                  {membersToInvite.map((member, index) => (
                      <div key={index} className="flex items-center gap-2">
                          <Input
                          type="email"
                          placeholder="friend@example.com"
                          value={member}
                          onChange={(e) => handleMemberChange(index, e.target.value)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeMemberInput(index)} >
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addMemberInput} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Another Email
                  </Button>
                </div>

                {/* Phone Number Invitation Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Or invite by phone number</Label>
                  <p className="text-xs text-muted-foreground">Invite new members by phone number. Include country code (e.g., +1234567890). They&apos;ll see the invitation when they sign up with that phone number.</p>
                  {phonesToInvite.map((phone, index) => (
                      <div key={index} className="flex items-center gap-2">
                          <Input
                          type="tel"
                          placeholder="+1234567890"
                          value={phone}
                          onChange={(e) => handlePhoneChange(index, e.target.value)}
                          />
                          <Button variant="ghost" size="icon" onClick={() => removePhoneInput(index)} >
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addPhoneInput} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Another Phone
                  </Button>
                </div>
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center">
          <div>
            {isEditMode && isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={isDeleting || isSaving}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete Circle'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{circle?.name}&quot; and remove all members from this circle. This action cannot be undone.
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
          </div>
          <Button onClick={handleSaveCircle} disabled={isSaving || isDeleting}>
            {isSaving ? 'Saving...' : (isEditMode ? 'Send Invites' : 'Create Circle & Invite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
