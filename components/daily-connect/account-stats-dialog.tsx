'use client';

import { useState } from 'react';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Flame, Calendar, TrendingUp } from 'lucide-react';
import { calculateCheckInStats } from '@/lib/check-in-stats';
import type { User } from '@/lib/data';
import { Loader } from 'lucide-react';

interface AccountStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountStatsDialog({ open, onOpenChange }: AccountStatsDialogProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  // Query for all check-ins (for stats)
  const allCheckInsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, "users", user.uid, "checkIns"),
      orderBy("timestamp", "desc")
    );
  }, [firestore, user]);

  const { data: allCheckIns, isLoading: isAllCheckInsLoading } =
    useCollection(allCheckInsQuery);

  // Get user document for current streak
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc<User>(userDocRef);

  const stats = allCheckIns ? calculateCheckInStats(allCheckIns, userData?.streak) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Your Stats</DialogTitle>
          <DialogDescription>
            Track your check-in progress and streaks
          </DialogDescription>
        </DialogHeader>
        {isAllCheckInsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <Flame className="h-6 w-6 text-orange-500 mb-2" />
              <p className="text-2xl font-bold">{stats.currentStreak}</p>
              <p className="text-xs text-muted-foreground text-center">Current Streak</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <TrendingUp className="h-6 w-6 text-blue-500 mb-2" />
              <p className="text-2xl font-bold">{stats.longestStreak}</p>
              <p className="text-xs text-muted-foreground text-center">Longest Streak</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50 col-span-2 sm:col-span-1">
              <Calendar className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-2xl font-bold">{stats.totalCheckIns}</p>
              <p className="text-xs text-muted-foreground text-center">Total Check-ins</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.thisWeek}</p>
              <p className="text-xs text-muted-foreground text-center">This Week</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats.thisMonth}</p>
              <p className="text-xs text-muted-foreground text-center">This Month</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No check-in data yet. Start checking in to see your stats!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
