export const firebaseConfig = {
  "projectId": process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  "appId": process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  "apiKey": process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  "authDomain": process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  "measurementId": process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  "messagingSenderId": process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ""
};

// This is the VAPID key for web push notifications
export const VAPID_KEY = 'YOUR_VAPID_KEY_HERE';
