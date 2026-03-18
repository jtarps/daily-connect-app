'use client';

import FriendStatusList from '@/components/daily-connect/friend-status-list';
import InvitationList from '@/components/daily-connect/invitation-list';
import { AlertsList } from '@/components/daily-connect/alerts-list';
import { useUser } from '@/firebase/provider';
import { useUserCircles } from '@/hooks/use-circles';

export default function CirclePage() {
  const { user } = useUser();
  const { circles } = useUserCircles(user?.uid);
  const circleIds = circles?.map(c => c.id) || [];

  return (
    <div className="space-y-4">
        <AlertsList circleIds={circleIds} />
        <InvitationList />
        <FriendStatusList />
    </div>
  );
}
