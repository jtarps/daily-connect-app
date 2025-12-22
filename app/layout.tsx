
import type { Metadata } from 'next';
import { PT_Sans } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { NotificationManager } from '@/components/daily-connect/notification-manager';
import { PWAInstallPrompt } from '@/components/daily-connect/pwa-install-prompt';
import { ErrorBoundary } from '@/components/error-boundary';

const ptSans = PT_Sans({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-pt-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Daily Connect',
  description: 'Check in with your loved ones, daily.',
  manifest: '/manifest.json',
  themeColor: '#000000',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Daily Connect',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className={`${ptSans.variable} font-body antialiased`}>
        <ErrorBoundary>
          <FirebaseClientProvider>
            {children}
            <NotificationManager />
            <PWAInstallPrompt />
          </FirebaseClientProvider>
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
