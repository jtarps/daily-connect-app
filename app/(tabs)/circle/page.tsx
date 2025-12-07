import FriendStatusList from '@/components/daily-connect/friend-status-list';
import InvitationList from '@/components/daily-connect/invitation-list';
import { Separator } from '@/components/ui/separator';

export default function CirclePage() {
  return (
    <div className="space-y-6">
        <InvitationList />
        <Separator />
        <FriendStatusList />
    </div>
  );
}
