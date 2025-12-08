'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Invitation } from '@/lib/data';

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'loading' | 'found' | 'not-found' | 'accepted' | 'error'>('loading');

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!firestore || !token) {
        setStatus('not-found');
        setIsLoading(false);
        return;
      }

      try {
        const invitationsRef = collection(firestore, 'invitations');
        const q = query(invitationsRef, where('invitationToken', '==', token));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setStatus('not-found');
        } else {
          const inviteDoc = querySnapshot.docs[0];
          const inviteData = inviteDoc.data();
          
          // Check if invitation is still pending
          if (inviteData.status !== 'pending') {
            setStatus('not-found');
            return;
          }
          
          const invitation = {
            id: inviteDoc.id,
            ...inviteData,
          } as Invitation;
          setInvitation(invitation);
          setStatus('found');
        }
      } catch (error) {
        console.error('Error fetching invitation:', error);
        setStatus('error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [firestore, token]);

  const handleAccept = async () => {
    if (!invitation || !firestore || !user) return;

    setIsProcessing(true);
    try {
      const circleRef = doc(firestore, 'circles', invitation.circleId);
      const invitationRef = doc(firestore, 'invitations', invitation.id);

      // Add user to the circle's members
      await updateDoc(circleRef, {
        memberIds: arrayUnion(user.uid),
      });

      // Delete the invitation
      await deleteDoc(invitationRef);

      setStatus('accepted');
      toast({
        title: 'Circle Joined!',
        description: `You've been added to the "${invitation.circleName}" circle.`,
      });

      // Redirect to check-in page after a short delay
      setTimeout(() => {
        router.push('/check-in');
      }, 2000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: 'Error',
        description: 'Could not accept the invitation. Please try again.',
        variant: 'destructive',
      });
      setStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/">Go to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <CardTitle>Welcome to {invitation?.circleName}!</CardTitle>
            <CardDescription>
              You&apos;ve successfully joined the circle. Redirecting...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Join {invitation?.circleName}</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join this circle on Daily Connect!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              To accept this invitation, please create an account first. You&apos;ll need an email address to sign up.
            </p>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Note: Even though you received this link via WhatsApp/SMS, you&apos;ll still need an email address to create your account and remain logged in.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href={`/signup?invite=${token}`}>Sign Up with Email</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/login?invite=${token}`}>Already have an account? Log In</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'found' && invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Join {invitation.circleName}</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join this circle on Daily Connect!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Accept this invitation to join the circle and start checking in with your loved ones.
            </p>
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/check-in">Maybe Later</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

