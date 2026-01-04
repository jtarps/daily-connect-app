
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


interface FriendStatusCardProps {
  userId: string;
}

const FriendStatusCard = ({ userId }: FriendStatusCardProps) => {
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
          <div className="flex items-center gap-4 rounded-lg border p-4 transition-all">
              <Loader className="h-5 w-5 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading member status...</p>
          </div>
      );
  }

  if (!friend) {
      return (
        <div className="flex items-center gap-4 rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">Could not load friend data for ID: {userId}</p>
        </div>
      );
  }

  const { text, needsAttention, status } = formatCheckInTime(lastCheckIn?.timestamp?.toDate());

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border p-4 transition-all",
        needsAttention && "border-accent bg-accent/10"
      )}
    >
      <Avatar className="h-12 w-12 border-2 border-white">
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
          {friend.firstName.substring(0, 1)}{friend.lastName.substring(0, 1)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="font-semibold flex items-center gap-2 flex-wrap">
            {friend.firstName} {friend.lastName}
            {friend.streak && friend.streak > 1 && (
                <span className="flex items-center gap-1 text-xs font-medium text-orange-500 bg-orange-100 px-2 py-0.5 rounded-full">
                    <Flame className="h-3 w-3"/> {friend.streak}
                </span>
            )}
            {hasNotificationsEnabled ? (
              <Badge variant="default" className="bg-green-500 text-xs">
                <Bell className="h-3 w-3 mr-1" />
                Notifications
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Bell className="h-3 w-3 mr-1 opacity-50" />
                No Notifications
              </Badge>
            )}
        </p>
        <p
          className={cn(
            "text-sm",
            status === 'ok' && "text-green-600",
            status === 'away' && "text-yellow-600",
            status === 'inactive' && "text-accent-foreground"
          )}
        >
          {text}
        </p>
        {needsAttention && !hasNotificationsEnabled && (
          <p className="text-xs text-muted-foreground mt-1">
            Reminders unavailable - {friend.firstName} hasn&apos;t enabled notifications
          </p>
        )}
      </div>
      {needsAttention && (
        <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent hidden sm:block" />
            <Button size="sm" variant="outline" onClick={handleSendReminder} disabled={isSending}>
                {isSending ? <Loader className="mr-2 h-4 w-4 animate-spin"/> : <Bell className="mr-2 h-4 w-4" />}
                {isSending ? 'Sending...' : 'Remind'}
            </Button>
        </div>
      )}
    </div>
  );
};

export default FriendStatusCard;
