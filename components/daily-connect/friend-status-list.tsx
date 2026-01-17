
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase/provider";
import { useUserCircles } from "@/hooks/use-circles";
import { Loader, Plus, Search, Users } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { CircleManagerDialog } from "./create-circle-dialog";
import { Button } from "../ui/button";
import { CircleCard } from "./circle-card";
import { Input } from "../ui/input";

const FriendStatusList = () => {
    const { user } = useUser();
    const { circles, isLoading: isLoadingCircles } = useUserCircles(user?.uid);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter circles based on search query
    const filteredCircles = useMemo(() => {
        if (!circles) return [];
        if (!searchQuery.trim()) return circles;
        
        const query = searchQuery.toLowerCase().trim();
        return circles.filter(circle => 
            circle.name.toLowerCase().includes(query)
        );
    }, [circles, searchQuery]);

    // Scroll to a specific circle
    const scrollToCircle = (circleId: string) => {
        if (typeof window === 'undefined') return;
        const element = document.getElementById(`circle-${circleId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Highlight the circle briefly
            element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
            setTimeout(() => {
                element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
            }, 2000);
        }
    };

    const renderContent = () => {
        if (isLoadingCircles) {
            return (
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-6 w-32" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-8 w-8 rounded" />
                                    <Skeleton className="h-8 w-8 rounded" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-20 w-full rounded" />
                                <Skeleton className="h-20 w-full rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        
        if (!circles || circles.length === 0) {
            return (
                <div className="text-center space-y-4 p-12 border-2 border-dashed rounded-lg bg-muted/30">
                    <div className="flex justify-center">
                        <div className="bg-primary/10 p-4 rounded-full">
                            <Users className="h-12 w-12 text-primary/60" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold">No circles yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Create your first circle to start connecting with your loved ones and checking in daily.
                        </p>
                    </div>
                    <CircleManagerDialog mode="create">
                        <Button className="mt-4">
                            <Plus className="mr-2 h-4 w-4"/>
                            Create Your First Circle
                        </Button>
                    </CircleManagerDialog>
                </div>
            );
        }

        if (filteredCircles.length === 0) {
            return (
                <div className="text-center text-muted-foreground p-8">
                    <p>No circles found matching &quot;{searchQuery}&quot;</p>
                    <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setSearchQuery('')}
                    >
                        Clear Search
                    </Button>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {filteredCircles.map((circle) => (
                    <div key={circle.id} id={`circle-${circle.id}`}>
                        <CircleCard circle={circle} />
                    </div>
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
      <CardContent className="space-y-4">
        {circles && circles.length > 1 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search circles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}
        {circles && circles.length > 1 && searchQuery && (
          <div className="flex flex-wrap gap-2">
            {filteredCircles.map((circle) => (
              <Button
                key={circle.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  scrollToCircle(circle.id);
                  setSearchQuery('');
                }}
              >
                {circle.name}
              </Button>
            ))}
          </div>
        )}
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default FriendStatusList;
