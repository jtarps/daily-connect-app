
'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FriendStatusCard from "./friend-status-card";
import { useUser, useFirestore } from "@/firebase/provider";
import { useUserCircles } from "@/hooks/use-circles";
import { Loader, Plus, Settings, UserPlus, Bell } from "lucide-react";
import { CircleManagerDialog } from "./create-circle-dialog";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { sendRemindersToInactiveMembers } from "@/app/actions";
import { doc, getDoc } from "firebase/firestore";
import type { User } from "@/lib/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FriendStatusList = () => {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { circles, isLoading: isLoadingCircles } = useUserCircles(user?.uid);
    const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
    const [isSendingReminders, setIsSendingReminders] = useState(false);

    // Set default to first circle when circles load
    const currentCircle = circles?.find(c => c.id === selectedCircleId) || circles?.[0];
    const circleName = currentCircle?.name || "Your Circle";

    const renderContent = () => {
        if (isLoadingCircles) {
            return (
                <div className="flex justify-center items-center h-24">
                    <Loader className="animate-spin text-primary" />
                </div>
            );
        }
        
        if (!currentCircle) {
            return (
                <div className="text-center text-muted-foreground space-y-4 p-8 border-2 border-dashed rounded-lg">
                    <p>You haven&apos;t created or joined a circle yet.</p>
                    <CircleManagerDialog mode="create">
                        <Button>
                            <Plus className="mr-2"/>
                            Create Your First Circle
                        </Button>
                    </CircleManagerDialog>
                </div>
            )
        }

        // Filter out the current user from the list of members to display
        const otherMembers = (currentCircle.memberIds || []).filter(memberId => memberId !== user?.uid);

        if (otherMembers.length === 0) {
            return (
                <div className="text-center text-muted-foreground p-8">
                    <p>You&apos;re the only one in this circle. Invite some friends!</p>
                     <CircleManagerDialog circle={currentCircle} mode="edit">
                        <Button variant="outline" className="mt-4">
                            <UserPlus className="mr-2"/>
                            Invite Members
                        </Button>
                    </CircleManagerDialog>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {otherMembers.map((userId) => (
                    <FriendStatusCard key={userId} userId={userId} />
                ))}
            </div>
        );
    }


  const handleSendRemindersToInactive = async () => {
    if (!currentCircle || !user || !firestore) return;
    
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
        circleId: currentCircle.id,
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

  // Update selected circle when circles load or when a new circle is added
  useEffect(() => {
    if (circles && circles.length > 0) {
      // If no circle is selected, select the first one
      if (!selectedCircleId) {
        setSelectedCircleId(circles[0].id);
      }
      // If selected circle no longer exists (was deleted), select the first one
      else if (!circles.find(c => c.id === selectedCircleId)) {
        setSelectedCircleId(circles[0].id);
      }
      // If a new circle was added and we're creating, select the newest one
      else if (circles.length > 1 && selectedCircleId === circles[0].id) {
        // Keep current selection, but this handles the case where a new circle is created
        // The dialog will handle switching to the new circle
      }
    }
  }, [circles, selectedCircleId]);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
                <CardTitle className="mb-0">{currentCircle ? circleName : "My Circle"}</CardTitle>
                {circles && circles.length > 1 && (
                    <Select 
                        value={currentCircle?.id || circles[0]?.id || ""} 
                        onValueChange={(value) => setSelectedCircleId(value)}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select circle" />
                        </SelectTrigger>
                        <SelectContent>
                            {circles.map((circle) => (
                                <SelectItem key={circle.id} value={circle.id}>
                                    {circle.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
            <CardDescription>See the latest check-ins from your friends and family.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
            {currentCircle && (
                <>
                    <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleSendRemindersToInactive}
                        disabled={isSendingReminders}
                        title="Remind all inactive members"
                    >
                        {isSendingReminders ? (
                            <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                            <Bell className="h-4 w-4" />
                        )}
                        <span className="sr-only">Remind All Inactive</span>
                    </Button>
                    <CircleManagerDialog circle={currentCircle} mode="edit">
                        <Button variant="outline" size="icon">
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">Manage Members</span>
                        </Button>
                    </CircleManagerDialog>
                </>
            )}
            <CircleManagerDialog mode="create">
                <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                    <span className="sr-only">Create New Circle</span>
                </Button>
            </CircleManagerDialog>
        </div>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default FriendStatusList;
