import FriendStatusList from '@/components/daily-connect/friend-status-list';
import InvitationList from '@/components/daily-connect/invitation-list';

export default function CirclePage() {
  return (
    <div className="space-y-4">
        <InvitationList />
        <FriendStatusList />
    </div>
  );
}
