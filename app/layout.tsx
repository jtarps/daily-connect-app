
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { NotificationManager } from '@/components/daily-connect/notification-manager';

const ptSans = PT_Sans({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-pt-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Daily Connect',
  description: 'Check in with your loved ones, daily.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${ptSans.variable} font-body antialiased`}>
        <FirebaseClientProvider>
          {children}
          <NotificationManager />
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
