
'use client';

import { useState, useEffect } from 'react';
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
import { X, Plus, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Circle } from '@/lib/data';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


interface CircleManagerDialogProps {
  children: React.ReactNode;
  circle?: Circle; 
  mode: 'create' | 'edit';
}

export function CircleManagerDialog({ children, circle, mode }: CircleManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [circleName, setCircleName] = useState('');
  const [membersToInvite, setMembersToInvite] = useState<string[]>(['']);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (open) {
      if (isEditMode && circle) {
        setCircleName(circle.name);
        setMembersToInvite(['']);
      } else {
        setCircleName('');
        setMembersToInvite(['']);
      }
    }
  }, [circle, isEditMode, open]);


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

  const sendInvitations = async (circleId: string, currentCircleName: string) => {
    if (!user) return;
    const inviterId = user.uid;
    const emailsToInvite = membersToInvite.map(m => m.trim()).filter(m => m.length > 0 && m.includes('@'));

    if (emailsToInvite.length === 0) {
        toast({ title: "No new members to invite.", description: "Enter at least one valid email address."});
        return;
    };
    
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firebase is not available. Please refresh the page.',
      });
      return;
    }
    const invitationsRef = collection(firestore, 'invitations');
    let invitesSent = 0;

    for (const email of emailsToInvite) {
        const invitationData = {
            circleId: circleId,
            circleName: currentCircleName,
            inviterId: inviterId,
            inviteeEmail: email,
            status: 'pending',
            createdAt: serverTimestamp(),
        };

        // We don't await this, just send them off
        addDoc(invitationsRef, invitationData).then(() => {
            invitesSent++;
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: 'invitations',
                operation: 'create',
                requestResourceData: invitationData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }

    toast({
        title: "Invitations Sent",
        description: `We've sent invites to ${emailsToInvite.length} potential new member(s).`,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Manage Circle' : 'Create a New Circle'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
                ? `Editing "${circle?.name}". You can invite new members by email.`
                : 'Give your circle a name and invite members to join via email.'
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
            <div className="col-span-3 space-y-2">
                <p className="text-xs text-muted-foreground">Invite new members to this circle. If they don&apos;t have an account, they&apos;ll be prompted to create one.</p>
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
                    Add Another
                </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSaveCircle} disabled={isSaving}>
            {isSaving ? 'Saving...' : (isEditMode ? 'Send Invites' : 'Create Circle & Invite')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
