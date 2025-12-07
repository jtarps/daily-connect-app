import ForgotPasswordForm from "@/components/daily-connect/forgot-password-form";

export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm px-4">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

