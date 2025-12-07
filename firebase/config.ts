// Validate that required Firebase config values are present
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    if (typeof window === 'undefined') {
      // Server-side: throw error
      throw new Error(
        `Missing required environment variable: ${name}. ` +
        `Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set.`
      );
    } else {
      // Client-side: log warning and return empty string (will cause Firebase to error with a clearer message)
      console.error(`Missing required environment variable: ${name}`);
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
export const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';
