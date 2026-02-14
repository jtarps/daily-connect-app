'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FriendStatusCard from "./friend-status-card";
import { useUser, useFirestore } from "@/firebase/provider";
import { Loader, Settings, Bell, UserPlus, MessageSquare, MoreHorizontal } from "lucide-react";
import { CircleManagerDialog } from "./create-circle-dialog";
import { CircleNotes } from "./circle-notes";
import { CircleHelpAlert } from "./circle-help-alert";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
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
  const [notesOpen, setNotesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filter out the current user from the list of members to display
  const otherMembers = (circle.memberIds || []).filter(memberId => memberId !== user?.uid);

  const handleSendRemindersToInactive = async () => {
    if (!circle || !user || !firestore) return;

    setIsSendingReminders(true);
    try {
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
      <div className="divide-y">
        {otherMembers.map((userId) => (
          <FriendStatusCard key={userId} userId={userId} circleId={circle.id} />
        ))}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 pb-2 sm:pb-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{circle.name}</CardTitle>
            <CardDescription className="mt-0.5">
              {otherMembers.length} member{otherMembers.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <CircleHelpAlert circle={circle} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setNotesOpen(true)}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Notes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleSendRemindersToInactive}
                  disabled={isSendingReminders || otherMembers.length === 0}
                >
                  {isSendingReminders ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="mr-2 h-4 w-4" />
                  )}
                  Remind All
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pt-0 pb-2 sm:pb-4">
          {renderContent()}
        </CardContent>
      </Card>

      {/* Controlled dialogs opened from dropdown */}
      <CircleNotes circle={circle} open={notesOpen} onOpenChange={setNotesOpen} />
      <CircleManagerDialog circle={circle} mode="edit" open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
