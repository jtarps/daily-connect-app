
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCheckInTime, cn } from "@/lib/utils";
import { AlertTriangle, Bell, Flame, Loader } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useMemoFirebase, useUser } from "@/firebase/provider";
import { useDoc } from "@/firebase/firestore/use-doc";
import { useCollection } from "@/firebase/firestore/use-collection";
import { doc, collection, query, orderBy, limit, getDoc } from "firebase/firestore";
import type { User, CheckIn } from "@/lib/data";
import { sendReminder } from "@/app/actions";
import { useState } from "react";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";


interface FriendStatusCardProps {
  userId: string;
  circleId?: string; // Optional circle ID for context
}

const FriendStatusCard = ({ userId, circleId }: FriendStatusCardProps) => {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [isSending, setIsSending] = useState(false);


  // Fetch friend's user data
  const userDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, "users", userId);
  }, [firestore, userId]);
  const { data: friend, isLoading: isLoadingFriend } = useDoc<User>(userDocRef);

  // Fetch friend's latest check-in
  const checkInsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'users', userId, 'checkIns'), 
        orderBy('timestamp', 'desc'), 
        limit(1)
    );
  }, [firestore, userId]);
  const { data: latestCheckIns, isLoading: isLoadingCheckIn } = useCollection<CheckIn>(checkInsQuery);
  
  // Check if friend has notifications enabled (has FCM tokens)
  const fcmTokensQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'users', userId, 'fcmTokens');
  }, [firestore, userId]);
  const { data: fcmTokens } = useCollection(fcmTokensQuery);
  const hasNotificationsEnabled = fcmTokens && fcmTokens.length > 0;
  
  const lastCheckIn = latestCheckIns?.[0];

  const handleSendReminder = async () => {
    if (!friend || !currentUser || !firestore) return;

    // Check if notifications are enabled before attempting to send
    if (!hasNotificationsEnabled) {
      toast({
        title: "Reminders unavailable",
        description: `${friend.firstName} hasn't enabled notifications`,
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
        // Get current user's name from Firestore
        const currentUserDocRef = doc(firestore, "users", currentUser.uid);
        const currentUserDoc = await getDoc(currentUserDocRef);
        const currentUserData = currentUserDoc.data() as User | undefined;
        const senderName = currentUserData ? `${currentUserData.firstName} ${currentUserData.lastName}` : 'Someone';
        
        const response = await sendReminder({
            recipientName: friend.firstName,
            recipientId: friend.id,
            senderName: senderName,
        });

        toast({
            title: response.success ? "Reminder Sent!" : "Reminder Failed",
            description: response.message,
            variant: response.success ? "default" : "destructive",
        });

    } catch (error) {
        console.error("Failed to send reminder:", error);
        toast({
            title: "Error",
            description: "Could not send reminder. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsSending(false);
    }
  };

  const isLoading = isLoadingFriend || isLoadingCheckIn;

  if (isLoading) {
      return (
          <div className="flex items-start gap-3 rounded-lg border p-3 sm:p-4">
              <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-16 shrink-0" />
          </div>
      );
  }

  if (!friend) {
      return (
        <div className="flex items-center gap-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Could not load member</p>
                <p className="text-xs text-muted-foreground mt-1">Unable to load data for this member. Please try refreshing.</p>
            </div>
        </div>
      );
  }

  const { text, needsAttention, status } = formatCheckInTime(lastCheckIn?.timestamp?.toDate());

  // Format name: First name + last initial (e.g., "John D.")
  const displayName = friend.lastName 
    ? `${friend.firstName} ${friend.lastName.substring(0, 1)}.`
    : friend.firstName;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-3 sm:p-4 transition-all",
        needsAttention && "border-accent bg-accent/10"
      )}
    >
      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
          {friend.firstName.substring(0, 1)}{friend.lastName?.substring(0, 1) || ''}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1 flex-wrap">
          <p className="font-semibold text-sm sm:text-base truncate">
            {displayName}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {friend.streak && friend.streak > 1 && (
              <span className="flex items-center gap-1 text-xs font-medium text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full whitespace-nowrap">
                <Flame className="h-3 w-3"/> {friend.streak}
              </span>
            )}
            {hasNotificationsEnabled ? (
              <Badge variant="default" className="bg-green-500 text-xs whitespace-nowrap">
                <Bell className="h-3 w-3 mr-1" />
                Notifications
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs whitespace-nowrap">
                <Bell className="h-3 w-3 mr-1 opacity-50" />
                No Notifications
              </Badge>
            )}
          </div>
        </div>
        <p
          className={cn(
            "text-xs sm:text-sm break-words",
            status === 'ok' && "text-green-600 dark:text-green-400",
            status === 'away' && "text-yellow-600 dark:text-yellow-400",
            status === 'inactive' && "text-accent-foreground"
          )}
        >
          {text}
        </p>
      </div>
      {needsAttention && (
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-accent hidden sm:block" />
            <Button size="sm" variant="outline" onClick={handleSendReminder} disabled={isSending} className="text-xs sm:text-sm">
                {isSending ? <Loader className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin"/> : <Bell className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />}
                <span className="hidden sm:inline">{isSending ? 'Sending...' : 'Remind'}</span>
                <span className="sm:hidden">{isSending ? '...' : 'Remind'}</span>
            </Button>
        </div>
      )}
    </div>
  );
};

export default FriendStatusCard;
