'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FriendStatusCard from "./friend-status-card";
import { useUser, useFirestore } from "@/firebase/provider";
import { Loader, Settings, Bell, UserPlus } from "lucide-react";
import { CircleManagerDialog } from "./create-circle-dialog";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendRemindersToInactiveMembers } from "@/app/actions";
import { doc, getDoc } from "firebase/firestore";
import type { User, Circle } from "@/lib/data";
import { useState } from "react";

interface CircleCardProps {
  circle: Circle;
}

export function CircleCard({ circle }: CircleCardProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSendingReminders, setIsSendingReminders] = useState(false);

  // Filter out the current user from the list of members to display
  const otherMembers = (circle.memberIds || []).filter(memberId => memberId !== user?.uid);

  const handleSendRemindersToInactive = async () => {
    if (!circle || !user || !firestore) return;
    
    setIsSendingReminders(true);
    try {
      // Get current user's name
      const currentUserDocRef = doc(firestore, "users", user.uid);
      const currentUserDoc = await getDoc(currentUserDocRef);
      const currentUserData = currentUserDoc.data() as User | undefined;
      const senderName = currentUserData 
        ? `${currentUserData.firstName} ${currentUserData.lastName}` 
        : 'Someone';

      const response = await sendRemindersToInactiveMembers({
        circleId: circle.id,
        senderId: user.uid,
        senderName: senderName,
      });

      toast({
        title: response.success ? "Reminders Sent!" : "Reminders Failed",
        description: response.message,
        variant: response.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Failed to send reminders:", error);
      toast({
        title: "Error",
        description: "Could not send reminders. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminders(false);
    }
  };

  const renderContent = () => {
    if (otherMembers.length === 0) {
      return (
        <div className="text-center text-muted-foreground p-8">
          <p>You&apos;re the only one in this circle. Invite some friends!</p>
          <CircleManagerDialog circle={circle} mode="edit">
            <Button variant="outline" className="mt-4">
              <UserPlus className="mr-2 h-4 w-4"/>
              Invite Members
            </Button>
          </CircleManagerDialog>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {otherMembers.map((userId) => (
          <FriendStatusCard key={userId} userId={userId} />
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex-1">
          <CardTitle className="text-lg">{circle.name}</CardTitle>
          <CardDescription className="mt-1">
            {otherMembers.length} member{otherMembers.length !== 1 ? 's' : ''}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleSendRemindersToInactive}
            disabled={isSendingReminders || otherMembers.length === 0}
            title="Remind all inactive members"
            className="h-8 w-8"
          >
            {isSendingReminders ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            <span className="sr-only">Remind All Inactive</span>
          </Button>
          <CircleManagerDialog circle={circle} mode="edit">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Manage Circle</span>
            </Button>
          </CircleManagerDialog>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}

