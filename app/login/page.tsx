import LoginForm from "@/components/daily-connect/login-form";
import InvitationList from '@/components/daily-connect/invitation-list';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4 space-y-4">
        <LoginForm />
        <InvitationList />
      </div>
    </div>
  );
}
