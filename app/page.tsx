
'use client';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users } from "lucide-react";
import { useUser } from "@/firebase/provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const dynamic = 'force-dynamic';

export default function LandingPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/check-in');
    }
  }, [user, isUserLoading, router]);


  if (isUserLoading || user) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-background">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
            <div className="bg-primary p-4 rounded-2xl shadow-lg">
                <Users className="text-primary-foreground h-12 w-12" />
            </div>
        </div>
        <h1 className="text-4xl font-bold text-foreground font-headline mb-4">
          Welcome to Daily Connect
        </h1>
        <p className="text-muted-foreground mb-8">
          A simple way to let your loved ones know you&apos;re okay, every day.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/signup">Sign Up</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
