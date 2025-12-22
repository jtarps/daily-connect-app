import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dailyconnect.app',
  appName: 'Daily Connect',
  // For development: Use server.url to point to your dev server
  // For production: Either deploy Next.js and point server.url to it, OR use static export
  // Note: Next.js builds to '.next' by default. For static export, add 'output: "export"' to next.config.js
  // This webDir is used when server.url is not set (for static builds)
  webDir: 'public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    // For development with live reload, uncomment and set your dev server URL:
    url: 'http://192.168.2.112:3000',
    cleartext: true
    // For production, point to your deployed Next.js app:
    // url: 'https://your-app.vercel.app',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      spinnerColor: '#000000',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;

