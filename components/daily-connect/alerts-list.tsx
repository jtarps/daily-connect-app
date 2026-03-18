'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import type { NotOkayAlert } from '@/lib/data';
import { AlertTriangle, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '../ui/button';

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

  const handleDismiss = async (alertId: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'notOkayAlerts', alertId), { resolved: true });
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const handleDismissAll = async () => {
    if (!firestore) return;
    for (const alert of relevantAlerts) {
      try {
        await updateDoc(doc(firestore, 'notOkayAlerts', alert.id), { resolved: true });
      } catch {}
    }
    setAlerts(prev => prev.filter(a => !relevantAlerts.some(r => r.id === a.id)));
  };

  if (relevantAlerts.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-destructive">
          {relevantAlerts.length} alert{relevantAlerts.length !== 1 ? 's' : ''}
        </p>
        {relevantAlerts.length > 1 && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleDismissAll}>
            Dismiss All
          </Button>
        )}
      </div>
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
          <button
            onClick={() => handleDismiss(alert.id)}
            className="p-1 rounded-md hover:bg-destructive/10 shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      ))}
    </section>
  );
}
