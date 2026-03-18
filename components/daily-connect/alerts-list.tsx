'use client';

import { useMemo } from 'react';
import { useFirestore, useUser, useMemoFirebase } from '@/firebase/provider';
import { useCollection } from '@/firebase/firestore/use-collection';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import type { NotOkayAlert } from '@/lib/data';
import { AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AlertsListProps {
  circleIds: string[];
}

export function AlertsList({ circleIds }: AlertsListProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  // Query unresolved alerts for circles user is in
  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !user || circleIds.length === 0) return null;
    return query(
      collection(firestore, 'notOkayAlerts'),
      where('resolved', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
  }, [firestore, user, circleIds]);

  const { data: allAlerts, isLoading } = useCollection<NotOkayAlert>(alertsQuery);

  // Filter to only alerts relevant to user's circles (not sent by user)
  const relevantAlerts = useMemo(() => {
    if (!allAlerts || !user) return [];
    return allAlerts.filter(alert => {
      // Don't show alerts the user sent
      if (alert.userId === user.uid) return false;
      // Show alerts for user's circles or sent to all circles
      if (alert.circleId && circleIds.includes(alert.circleId)) return true;
      // Show alerts sent to user specifically
      if (alert.recipientId === user.uid) return true;
      // Show alerts with no circleId (sent to all circles) if user shares a circle
      if (!alert.circleId && !alert.recipientId) return true;
      return false;
    });
  }, [allAlerts, user, circleIds]);

  if (isLoading || relevantAlerts.length === 0) return null;

  return (
    <section className="space-y-2">
      {relevantAlerts.map((alert) => (
        <div
          key={alert.id}
          className="flex items-start gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20"
        >
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-destructive/10 shrink-0 mt-0.5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {alert.userName} needs help
            </p>
            {alert.message && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {alert.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {alert.createdAt?.toDate
                ? formatDistanceToNow(alert.createdAt.toDate(), { addSuffix: true })
                : 'just now'}
            </p>
          </div>
        </div>
      ))}
    </section>
  );
}
