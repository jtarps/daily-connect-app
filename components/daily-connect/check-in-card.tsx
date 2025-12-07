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
} from "lucide-react";
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
    if (!user) return null;
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
    if (!user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc<User>(userDocRef);
  const checkInInterval = userData?.checkInInterval || getDefaultInterval();
  const customHours = userData?.customCheckInHours;

  const performCheckIn = useCallback(async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to check in.",
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

      toast({
        title: isIntervalRestriction ? "Already Checked In" : "Check-in Failed",
        description: isIntervalRestriction
          ? errorMessage
          : "Could not save your check-in. Please try again.",
        variant: "destructive",
      });
    }
  }, [user, firestore, toast]);

  const { startListening, permission, isListening } = useShake(performCheckIn);

  useEffect(() => {
    if (permission === "granted") {
      startListening();
    }
  }, [permission, startListening]);

  const checkedInTime = latestCheckIn?.timestamp?.toDate();
  const hasCheckedInRecently = checkedInTime
    ? isWithinInterval(checkedInTime, checkInInterval, new Date(), customHours)
    : false;

  const renderContent = () => {
    if (isUserLoading || isCheckInLoading) {
      return (
        <div className="text-center flex flex-col items-center gap-4">
          <Loader className="h-16 w-16 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading your status...</p>
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
          <CheckCircle className="h-16 w-16 text-green-500" />
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
        </div>
      );
    }

    if (permission === "denied" || permission === "prompt") {
      return (
        <div className="text-center flex flex-col items-center gap-4">
          <div className="relative">
            <Hand className="h-16 w-16 text-primary" />
            {permission === "prompt" && (
              <Button
                onClick={startListening}
                size="sm"
                className="absolute -top-2 -right-2"
              >
                Enable Shake
              </Button>
            )}
          </div>

          <p className="text-muted-foreground mb-2 text-center">
            {permission === "denied"
              ? "Motion detection is disabled."
              : "Enable shake to check-in,"}
            <br />
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
        <Button onClick={performCheckIn} size="lg" className="w-full">
          <Hand className="mr-2" /> I&apos;m OK
        </Button>
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
          Let your circle know you&apos;re okay.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center min-h-[200px] p-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default CheckInCard;
