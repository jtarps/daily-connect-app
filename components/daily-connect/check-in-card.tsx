
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, CheckCircle, AlertTriangle, Loader, Hand } from "lucide-react";
import { useShake } from "@/hooks/use-shake";
import { useToast } from "@/hooks/use-toast";
import { isToday, format, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useFirestore, useUser, useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";
import { collection, query, orderBy, limit, serverTimestamp, doc, runTransaction, getDocs } from "firebase/firestore";
import type { User } from "@/lib/data";

const CheckInCard = () => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const checkInsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
        collection(firestore, 'users', user.uid, 'checkIns'), 
        orderBy('timestamp', 'desc'), 
        limit(1)
    );
  }, [firestore, user]);

  const { data: latestCheckIns, isLoading: isCheckInLoading } = useCollection(checkInsQuery);
  const latestCheckIn = latestCheckIns?.[0];

  const performCheckIn = useCallback(async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to check in.",
        variant: 'destructive',
      });
      return;
    }

    const userRef = doc(firestore, 'users', user.uid);
    const checkInsRef = collection(firestore, 'users', user.uid, 'checkIns');
    const newCheckInRef = doc(checkInsRef); // Create a new doc reference for the check-in

    try {
        await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw "User document does not exist!";
            }
            
            // Get latest check-in within the transaction
            const latestCheckInQuery = query(checkInsRef, orderBy('timestamp', 'desc'), limit(1));
            const latestCheckInSnapshot = await getDocs(latestCheckInQuery);
            const latestCheckIn = latestCheckInSnapshot.docs?.[0];
            
            const userData = userDoc.data() as User;
            let currentStreak = userData.streak || 0;

            const now = new Date();
            const latestCheckInDate = latestCheckIn?.data().timestamp?.toDate();

            if (latestCheckInDate) {
                if(isToday(latestCheckInDate)) {
                    // Already checked in today, do nothing.
                    toast({
                        title: "Already Checked In",
                        description: "You&apos;re already checked in for today!",
                    });
                    return; // Exit transaction
                }
                const daysDifference = differenceInCalendarDays(now, latestCheckInDate);
                if (daysDifference === 1) {
                    // Consecutive day
                    currentStreak += 1;
                } else {
                    // Missed a day
                    currentStreak = 1;
                }
            } else {
                // First check-in
                currentStreak = 1;
            }

            // Perform the writes
            transaction.set(newCheckInRef, { userId: user.uid, timestamp: serverTimestamp() });
            transaction.update(userRef, { streak: currentStreak });
        });

        toast({
          title: "Checked In!",
          description: "You&apos;re all set for today. We&apos;ve notified your circle.",
          variant: 'default',
        });
    } catch (error) {
        console.error("Check-in transaction failed: ", error);
        toast({
            title: "Check-in Failed",
            description: "Could not save your check-in. Please try again.",
            variant: 'destructive',
        });
    }
  }, [user, firestore, toast]);

  const { startListening, permission, isListening } = useShake(performCheckIn);

  useEffect(() => {
    if (permission === 'granted') {
      startListening();
    }
  }, [permission, startListening]);

  const checkedInTime = latestCheckIn?.timestamp?.toDate();
  const hasCheckedInToday = checkedInTime && isToday(checkedInTime);

  const renderContent = () => {
    if (isUserLoading || isCheckInLoading) {
        return (
            <div className="text-center flex flex-col items-center gap-4">
                <Loader className="h-16 w-16 text-primary animate-spin" />
                <p className="text-muted-foreground">Loading your status...</p>
            </div>
        );
    }
    
    if (hasCheckedInToday) {
      return (
        <div className="text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <div className="space-y-1">
            <p className="font-semibold text-lg">You&apos;re checked in!</p>
            <p className="text-muted-foreground text-sm">
              Today at {format(checkedInTime!, "h:mm a")}
            </p>
          </div>
        </div>
      );
    }
    
    if (permission === 'denied' || permission === 'prompt') {
        return (
            <div className="text-center flex flex-col items-center gap-4">
                <div className="relative">
                  <Hand className="h-16 w-16 text-primary" />
                  {permission === 'prompt' && (
                    <Button onClick={startListening} size="sm" className="absolute -top-2 -right-2">Enable Shake</Button>
                  )}
                </div>

                <p className="text-muted-foreground mb-2 text-center">
                    {permission === 'denied' 
                        ? "Motion detection is disabled."
                        : "Enable shake to check-in,"}
                    <br/>
                    or check in manually.
                </p>
                <Button onClick={performCheckIn} size="lg" className="w-full">
                    <Hand className="mr-2" /> I&apos;m OK
                </Button>
            </div>
        );
    }

    return (
      <div className="text-center flex flex-col items-center gap-4">
        <Smartphone className={cn("h-16 w-16 text-primary", isListening && "animate-shake-subtle")} />
        <div className="space-y-2">
            <p className="font-semibold text-lg">Shake to check in</p>
            <p className="text-muted-foreground text-sm">Or tap the button below.</p>
        </div>
        <Button onClick={performCheckIn} size="lg" className="w-full">
            <Hand className="mr-2" /> I&apos;m OK
        </Button>
      </div>
    );
  };

  return (
    <Card className={cn(
        "h-full transition-all duration-500",
        isListening && !hasCheckedInToday && "shadow-lg shadow-primary/20"
    )}>
      <CardHeader>
        <CardTitle>Daily Check-in</CardTitle>
        <CardDescription>Let your circle know you&apos;re okay.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center min-h-[200px] p-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default CheckInCard;
