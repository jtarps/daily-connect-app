
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase/provider";
import { useUserCircles } from "@/hooks/use-circles";
import { Loader, Plus } from "lucide-react";
import { CircleManagerDialog } from "./create-circle-dialog";
import { Button } from "../ui/button";
import { CircleCard } from "./circle-card";

const FriendStatusList = () => {
    const { user } = useUser();
    const { circles, isLoading: isLoadingCircles } = useUserCircles(user?.uid);

    const renderContent = () => {
        if (isLoadingCircles) {
            return (
                <div className="flex justify-center items-center h-24">
                    <Loader className="animate-spin text-primary" />
                </div>
            );
        }
        
        if (!circles || circles.length === 0) {
            return (
                <div className="text-center text-muted-foreground space-y-4 p-8 border-2 border-dashed rounded-lg">
                    <p>You haven&apos;t created or joined a circle yet.</p>
                    <CircleManagerDialog mode="create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4"/>
                            Create Your First Circle
                        </Button>
                    </CircleManagerDialog>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {circles.map((circle) => (
                    <CircleCard key={circle.id} circle={circle} />
                ))}
            </div>
        );
    };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex-1">
            <CardTitle className="mb-0">My Circles</CardTitle>
            <CardDescription>
              {circles && circles.length > 0 
                ? `${circles.length} circle${circles.length !== 1 ? 's' : ''} - See the latest check-ins from your friends and family.`
                : 'See the latest check-ins from your friends and family.'}
            </CardDescription>
        </div>
        <div className="flex items-center gap-2">
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
