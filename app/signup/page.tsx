import SignupForm from "@/components/daily-connect/signup-form";
import InvitationList from '@/components/daily-connect/invitation-list';

export const dynamic = 'force-dynamic';

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4 space-y-4">
        <SignupForm />
        <InvitationList />
      </div>
    </div>
  );
}
