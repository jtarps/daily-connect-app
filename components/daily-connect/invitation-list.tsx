
'use client';

import { useFirestore, useUser, useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, where, doc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import type { Invitation } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Loader, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const InvitationList = () => {
    const { user, isUserLoading } = useUser();

    if (isUserLoading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
                <Loader className="h-4 w-4 animate-spin"/>
                <span>Checking for invitations...</span>
            </div>
        );
    }
    
    if (!user || !user.email) {
        return null;
    }
    
    return <PendingInvitations email={user.email} />;
};

const PendingInvitations = ({ email }: { email: string }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const invitationsQuery = useMemoFirebase(() => {
        if (!email) return null;
        return query(
            collection(firestore, 'invitations'),
            where('inviteeEmail', '==', email)
        );
    }, [firestore, email]);

    const { data: myInvitations, isLoading, error } = useCollection<Invitation>(invitationsQuery);
    
    const handleAccept = async (invitation: Invitation) => {
        if (!user) return;
        
        const circleRef = doc(firestore, 'circles', invitation.circleId);
        const invitationRef = doc(firestore, 'invitations', invitation.id);

        // Add user to the circle's members
        updateDoc(circleRef, {
            memberIds: arrayUnion(user.uid)
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: circleRef.path,
                operation: 'update',
                requestResourceData: { memberIds: arrayUnion(user.uid) },
            });
            errorEmitter.emit('permission-error', permissionError);
        });

        // Delete the invitation
        deleteDoc(invitationRef).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: invitationRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        });

        toast({
            title: "Circle Joined!",
            description: `You've been added to the "${invitation.circleName}" circle.`
        });
    };
    
    const handleDecline = async (invitation: Invitation) => {
        const invitationRef = doc(firestore, 'invitations', invitation.id);
        deleteDoc(invitationRef).catch(async (serverError) => {
             const permissionError = new FirestorePermissionError({
                path: invitationRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
        toast({
            title: "Invitation Declined",
            variant: "default",
        });
    };

    if (isLoading) {
         return (
            <div className="flex items-center gap-2 text-muted-foreground p-4">
                <Loader className="h-4 w-4 animate-spin"/>
                <span>Loading invitations...</span>
            </div>
        );
    }
    
    if (!myInvitations || myInvitations.length === 0) {
        return null; // Don't render anything if there are no invitations
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5"/> You&apos;re Invited!</CardTitle>
                <CardDescription>You have pending invitations to join a circle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {myInvitations.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                        <div>
                            <p>You&apos;ve been invited to join <strong>{invite.circleName}</strong>.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleAccept(invite)}>Accept</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDecline(invite)}>Decline</Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}


export default InvitationList;
