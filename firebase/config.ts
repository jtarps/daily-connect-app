// Validate that required Firebase config values are present
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    // During build time, don't throw - just return empty string
    // This allows the build to complete even if env vars aren't set
    if (typeof window === 'undefined') {
      // Server-side during build: return empty string to allow build to complete
      // The actual validation will happen at runtime
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return '';
      }
      // Server-side at runtime: throw error
      throw new Error(
        `Missing required environment variable: ${name}. ` +
        `Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set.`
      );
    } else {
      // Client-side: log detailed warning but don't throw
      // In Capacitor native apps, env vars might not be available immediately
      const isProduction = process.env.NODE_ENV === 'production';
      const message = isProduction
        ? `Missing required environment variable: ${name}. Please check your Vercel project settings and ensure ${name} is set in Environment Variables.`
        : `Missing required environment variable: ${name}. Please check your .env.local file. For native apps, ensure the dev server has these variables set.`;
      console.warn(message);
      return '';
    }
  }
  return value;
}

export const firebaseConfig = {
  "projectId": getRequiredEnvVar("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  "appId": getRequiredEnvVar("NEXT_PUBLIC_FIREBASE_APP_ID"),
  "apiKey": getRequiredEnvVar("NEXT_PUBLIC_FIREBASE_API_KEY"),
  "authDomain": getRequiredEnvVar("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  "measurementId": process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  "messagingSenderId": getRequiredEnvVar("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")
};

// This is the VAPID key for web push notifications
// Get this from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
export const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';
