
import LoginForm from "@/components/daily-connect/login-form";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <LoginForm />
      </div>
    </div>
  );
}
