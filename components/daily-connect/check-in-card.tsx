"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  CheckCircle,
  AlertTriangle,
  Loader,
  Hand,
  Undo2,
} from "lucide-react";
import { NotOkayAlert } from "./not-okay-alert";
import { Skeleton } from "../ui/skeleton";
import { useShake } from "@/hooks/use-shake";
import { useToast } from "@/hooks/use-toast";
import { isToday, format, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useFirestore, useUser, useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase/firestore/use-collection";
import { useDoc } from "@/firebase/firestore/use-doc";
import {
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
  doc,
  runTransaction,
  getDocs,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "@/lib/data";
import {
  canCheckIn,
  getDefaultInterval,
  isWithinInterval,
} from "@/lib/check-in-intervals";
import { notifyCircleOnCheckIn } from "@/app/actions";

const CheckInCard = () => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const checkInsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, "users", user.uid, "checkIns"),
      orderBy("timestamp", "desc"),
      limit(1)
    );
  }, [firestore, user]);

  const { data: latestCheckIns, isLoading: isCheckInLoading } =
    useCollection(checkInsQuery);
  const latestCheckIn = latestCheckIns?.[0];

  // Get user document to access check-in interval
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc<User>(userDocRef);
  const checkInInterval = userData?.checkInInterval || getDefaultInterval();
  const customHours = userData?.customCheckInHours;

  const performCheckIn = useCallback(async () => {
    if (!user || !firestore) {
      toast({
        title: "Error",
        description: "You must be logged in to check in.",
        variant: "destructive",
      });
      return;
    }
    if (!firestore) {
      toast({
        title: "Error",
        description: "Firebase is not available. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    const userRef = doc(firestore, "users", user.uid);
    const checkInsRef = collection(firestore, "users", user.uid, "checkIns");
    const newCheckInRef = doc(checkInsRef); // Create a new doc reference for the check-in

    try {
      // Track if check-in was successful and store user name from transaction
      let checkInSuccessful = false;
      let transactionUserName = "Someone";

      await runTransaction(firestore, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User document does not exist!");
        }

        // Get latest check-in within the transaction
        const latestCheckInQuery = query(
          checkInsRef,
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const latestCheckInSnapshot = await getDocs(latestCheckInQuery);
        const latestCheckIn = latestCheckInSnapshot.docs?.[0];

        const transactionUserData = userDoc.data() as User;
        let currentStreak = transactionUserData.streak || 0;
        const interval =
          transactionUserData.checkInInterval || getDefaultInterval();
        const customHours = transactionUserData.customCheckInHours;

        // Store user name from transaction data (fresh, not stale)
        transactionUserName =
          transactionUserData.firstName && transactionUserData.lastName
            ? `${transactionUserData.firstName} ${transactionUserData.lastName}`
            : "Someone";

        const now = new Date();
        const latestCheckInDate = latestCheckIn?.data().timestamp?.toDate();

        // Check if user can check in based on their interval
        if (latestCheckInDate) {
          const checkResult = canCheckIn(
            latestCheckInDate,
            interval,
            customHours
          );
          if (!checkResult.canCheckIn) {
            // Throw error to prevent transaction completion and notification
            throw new Error(
              checkResult.reason || "You've already checked in recently."
            );
          }
        }

        // Calculate streak based on interval
        if (latestCheckInDate) {
          if (interval === "daily") {
            const daysDifference = differenceInCalendarDays(
              now,
              latestCheckInDate
            );
            if (daysDifference === 1) {
              // Consecutive day
              currentStreak += 1;
            } else if (daysDifference > 1) {
              // Missed a day
              currentStreak = 1;
            }
          } else if (interval === "weekly") {
            const daysDifference = differenceInCalendarDays(
              now,
              latestCheckInDate
            );
            if (daysDifference <= 7) {
              // Within the same week or next week - increment streak
              // For weekly, we allow flexibility - any check-in within 7 days maintains/increments streak
              if (daysDifference > 0) {
                currentStreak += 1;
              }
              // If daysDifference === 0, it's the same day, so don't increment but maintain streak
            } else {
              // More than 7 days passed - reset streak
              currentStreak = 1;
            }
          } else {
            // For hourly/twice-daily, streak is based on daily consistency
            if (isToday(latestCheckInDate)) {
              // Already checked in today, streak continues
              // Don't increment, just maintain
            } else {
              // New day, increment streak if checked in yesterday
              const daysDifference = differenceInCalendarDays(
                now,
                latestCheckInDate
              );
              if (daysDifference === 1) {
                currentStreak += 1;
              } else {
                currentStreak = 1;
              }
            }
          }
        } else {
          // First check-in
          currentStreak = 1;
        }

        // Perform the writes
        transaction.set(newCheckInRef, {
          userId: user.uid,
          timestamp: serverTimestamp(),
        });
        transaction.update(userRef, { streak: currentStreak });

        // Mark as successful only after writes are queued
        checkInSuccessful = true;
      });

      // Only notify and show success toast if check-in actually succeeded
      if (checkInSuccessful) {
        // Notify circle members (fire and forget - don't wait for response)
        notifyCircleOnCheckIn({
          userId: user.uid,
          userName: transactionUserName,
        }).catch((error) => {
          // Silently fail - notification is not critical
          console.error("Failed to notify circle:", error);
        });

        toast({
          title: "Checked In!",
          description: "You&apos;re all set! Your circle has been notified.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Check-in transaction failed: ", error);

      // Check if this is an interval restriction error (user-friendly message)
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isIntervalRestriction =
        errorMessage.includes("already checked in") ||
        errorMessage.includes("wait") ||
        errorMessage.includes("recently");

      // Store error for display with retry button
      const errorState = {
        title: isIntervalRestriction ? "Already Checked In" : "Check-in Failed",
        message: isIntervalRestriction
          ? errorMessage
          : "Could not save your check-in. Please try again.",
        canRetry: !isIntervalRestriction,
      };

      toast({
        title: errorState.title,
        description: errorState.message,
        variant: "destructive",
        action: errorState.canRetry ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => performCheckIn()}
            className="ml-2"
          >
            Retry
          </Button>
        ) : undefined,
      });
    }
  }, [user, firestore, toast]);

  const { startListening, permission, isListening } = useShake(performCheckIn);

  // Note: startListening is called from the button click (user gesture required)
  // We don't auto-start here because permission must be requested from user interaction

  const checkedInTime = latestCheckIn?.timestamp?.toDate();
  const hasCheckedInRecently = checkedInTime
    ? isWithinInterval(checkedInTime, checkInInterval, new Date(), customHours)
    : false;

  // Check if we're in test/development mode
  const isTestMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_TEST_MODE === 'true';

  const undoCheckIn = useCallback(async () => {
    if (!user || !firestore || !latestCheckIn) {
      console.error("Undo check-in: Missing requirements", { user: !!user, firestore: !!firestore, latestCheckIn: !!latestCheckIn });
      toast({
        title: "Error",
        description: "Unable to undo check-in. Missing required data.",
        variant: "destructive",
      });
      return;
    }

    if (!latestCheckIn.id) {
      console.error("Undo check-in: latestCheckIn missing id", latestCheckIn);
      toast({
        title: "Error",
        description: "Check-in data is invalid. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    try {
      const checkInRef = doc(firestore, "users", user.uid, "checkIns", latestCheckIn.id);
      const userRef = doc(firestore, "users", user.uid);

      console.log("Undo check-in: Starting transaction", { checkInId: latestCheckIn.id, userId: user.uid });

      await runTransaction(firestore, async (transaction) => {
        // IMPORTANT: Firestore transactions require ALL reads before ALL writes
        // Read both documents first
        const checkInDoc = await transaction.get(checkInRef);
        if (!checkInDoc.exists()) {
          throw new Error("Check-in document does not exist");
        }

        const userDoc = await transaction.get(userRef);
        
        // Now perform all writes after all reads
        // Delete the check-in
        transaction.delete(checkInRef);

        // Adjust streak if user document exists
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          const currentStreak = userData.streak || 0;
          
          // If this was the only check-in, reset streak to 0
          // Otherwise, we could decrement, but for simplicity, just reset if it was 1
          if (currentStreak === 1) {
            transaction.update(userRef, { streak: 0 });
          } else if (currentStreak > 1) {
            // Decrement streak by 1
            transaction.update(userRef, { streak: currentStreak - 1 });
          }
        }
      });

      console.log("Undo check-in: Transaction completed successfully");
      toast({
        title: "Check-in Undone",
        description: "Your check-in has been removed. You can check in again.",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to undo check-in:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: "Error",
        description: `Failed to undo check-in: ${errorMessage}`,
        variant: "destructive",
      });
    }
  }, [user, firestore, latestCheckIn, toast]);

  const displayName = userData 
    ? `${userData.firstName}${userData.lastName ? ` ${userData.lastName.substring(0, 1)}.` : ''}`
    : 'Friend';

  const renderContent = () => {
    if (isUserLoading || isCheckInLoading) {
      return (
        <div className="space-y-4 w-full">
          <div className="flex flex-col items-center gap-3">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      );
    }

    if (hasCheckedInRecently && checkedInTime) {
      const checkResult = canCheckIn(
        checkedInTime,
        checkInInterval,
        customHours
      );
      return (
        <div className="text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95">
          <div className="relative">
            <CheckCircle className="h-16 w-16 text-green-500 animate-in zoom-in duration-300" />
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">You&apos;re checked in!</p>
            <p className="text-muted-foreground text-sm">
              {isToday(checkedInTime)
                ? `Today at ${format(checkedInTime, "h:mm a")}`
                : format(checkedInTime, "MMM d, h:mm a")}
            </p>
            {checkResult.reason && (
              <p className="text-xs text-muted-foreground mt-2">
                {checkResult.reason}
              </p>
            )}
          </div>
          {isTestMode && (
            <Button
              onClick={undoCheckIn}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Undo Check-in (Test Mode)
            </Button>
          )}
        </div>
      );
    }

    if (permission === "denied" || permission === "prompt") {
      return (
        <div className="text-center flex flex-col items-center gap-4">
          <div className="relative">
            <Hand className="h-16 w-16 text-primary" />
            {(permission === "prompt" || permission === "denied") && (
              <Button
                onClick={startListening}
                size="sm"
                className="absolute -top-2 -right-2"
                variant={permission === "denied" ? "outline" : "default"}
              >
                {permission === "denied" ? "Retry" : "Enable"}
              </Button>
            )}
          </div>

          <p className="text-muted-foreground mb-2 text-center">
            {permission === "denied" ? (
              <>
                Motion detection is disabled.
                <br />
                <span className="text-xs mt-1 block text-muted-foreground/80">
                  Tap &quot;Retry&quot; to request permission again, or use the button below to check in manually.
                </span>
              </>
            ) : (
              <>
                Enable shake to check-in,
                <br />
                or check in manually.
              </>
            )}
          </p>
          <div className="w-full space-y-2">
            <Button onClick={performCheckIn} size="lg" className="w-full">
              <Hand className="mr-2" /> I&apos;m OK
            </Button>
            <NotOkayAlert variant="subtle" className="w-full justify-center" />
          </div>
        </div>
      );
    }

    return (
      <div className="text-center flex flex-col items-center gap-4">
        <Smartphone
          className={cn(
            "h-16 w-16 text-primary",
            isListening && "animate-shake-subtle"
          )}
        />
        <div className="space-y-2">
          <p className="font-semibold text-lg">Shake to check in</p>
          <p className="text-muted-foreground text-sm">
            Or tap the button below.
          </p>
        </div>
        <div className="w-full space-y-2">
          <Button onClick={performCheckIn} size="lg" className="w-full">
            <Hand className="mr-2" /> I&apos;m OK
          </Button>
          <NotOkayAlert variant="subtle" className="w-full justify-center" />
        </div>
      </div>
    );
  };

  return (
    <Card
      className={cn(
        "h-full transition-all duration-500",
        isListening && !hasCheckedInRecently && "shadow-lg shadow-primary/20"
      )}
    >
      <CardHeader>
        <CardTitle>Daily Check-in</CardTitle>
        <CardDescription>
          Welcome back, {displayName}! Let your circle know you&apos;re okay.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center min-h-[200px] p-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default CheckInCard;
