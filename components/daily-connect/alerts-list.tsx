'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { NotOkayAlert } from '@/lib/data';
import { AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AlertsListProps {
  circleIds: string[];
}

export function AlertsList({ circleIds }: AlertsListProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [alerts, setAlerts] = useState<NotOkayAlert[]>([]);

  // Fetch unresolved alerts (manual query to avoid crashing on permission errors)
  useEffect(() => {
    if (!firestore || !user || circleIds.length === 0) return;

    const fetchAlerts = async () => {
      try {
        const q = query(
          collection(firestore, 'notOkayAlerts'),
          where('resolved', '==', false)
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NotOkayAlert));
        setAlerts(fetched);
      } catch (err) {
        // Silently fail — don't crash the page
        console.error('Error fetching alerts:', err);
      }
    };

    fetchAlerts();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [firestore, user, circleIds]);

  // Filter to only alerts relevant to user's circles (not sent by user)
  const relevantAlerts = useMemo(() => {
    if (!alerts.length || !user) return [];
    return alerts
      .filter(alert => {
        if (alert.userId === user.uid) return false;
        if (alert.circleId && circleIds.includes(alert.circleId)) return true;
        if (alert.recipientId === user.uid) return true;
        if (!alert.circleId && !alert.recipientId) return true;
        return false;
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
  }, [alerts, user, circleIds]);

  if (relevantAlerts.length === 0) return null;

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
