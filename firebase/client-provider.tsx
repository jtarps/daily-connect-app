
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
// Import initializeFirebase directly to avoid circular dependency issues
// We can't import from '@/firebase' because that would create a circular dependency
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// Local copy of initializeFirebase to avoid circular dependency
function initializeFirebase() {
  // Only initialize in browser environment - return null during SSR/build
  if (typeof window === 'undefined') {
    return {
      firebaseApp: null,
      auth: null,
      firestore: null,
      messaging: null,
    };
  }

  if (!getApps().length) {
    let firebaseApp: FirebaseApp;
    try {
      // Try automatic initialization first (for Firebase Hosting)
      firebaseApp = initializeApp();
    } catch (e) {
      // Fall back to explicit config
      // Validate all required config values before using it
      const missingVars: string[] = [];
      // Check both process.env and firebaseConfig to catch any issues
      const envVars = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseConfig.appId,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
      };

      if (!envVars.apiKey || envVars.apiKey.trim() === '') missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
      if (!envVars.projectId || envVars.projectId.trim() === '') missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      if (!envVars.appId || envVars.appId.trim() === '') missingVars.push('NEXT_PUBLIC_FIREBASE_APP_ID');
      if (!envVars.authDomain || envVars.authDomain.trim() === '') missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
      if (!envVars.messagingSenderId || envVars.messagingSenderId.trim() === '') missingVars.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
      
      if (missingVars.length > 0) {
        const isProduction = process.env.NODE_ENV === 'production';
        const errorMessage = isProduction
          ? `Firebase configuration is missing. Missing environment variables: ${missingVars.join(', ')}. Please check your Vercel project settings (Settings → Environment Variables) and ensure all NEXT_PUBLIC_FIREBASE_* variables are set. After adding variables, you may need to redeploy.`
          : `Firebase configuration is missing. Missing environment variables: ${missingVars.join(', ')}. Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set. Restart your dev server after adding environment variables.`;
        const error = new Error(errorMessage);
        console.error(error);
        throw error;
      }
      
      // Use the validated env vars directly instead of firebaseConfig
      const validatedConfig = {
        apiKey: envVars.apiKey,
        projectId: envVars.projectId,
        appId: envVars.appId,
        authDomain: envVars.authDomain,
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId || "",
        messagingSenderId: envVars.messagingSenderId,
      };
      
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(validatedConfig);
    }

    const isBrowser = typeof window !== 'undefined';
    return {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore: getFirestore(firebaseApp),
      messaging: isBrowser ? getMessaging(firebaseApp) : null,
    };
  }

  const app = getApp();
  const isBrowser = typeof window !== 'undefined';
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    messaging: isBrowser ? getMessaging(app) : null,
  };
}

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // During SSR/build, return null services - Firebase will initialize on client side
    if (typeof window === 'undefined') {
      return {
        firebaseApp: null,
        auth: null,
        firestore: null,
        messaging: null,
      };
    }

    try {
      // Debug: Log environment variable presence (without exposing values)
      const envVars = {
        hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        hasMessagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      };
      console.log('Firebase env vars check:', envVars);
      console.log('Firebase config values:', {
        projectId: firebaseConfig.projectId ? `${firebaseConfig.projectId.substring(0, 10)}...` : 'MISSING',
        appId: firebaseConfig.appId ? `${firebaseConfig.appId.substring(0, 10)}...` : 'MISSING',
        apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'MISSING',
        authDomain: firebaseConfig.authDomain ? `${firebaseConfig.authDomain.substring(0, 20)}...` : 'MISSING',
        messagingSenderId: firebaseConfig.messagingSenderId || 'MISSING',
      });
      
      // Initialize Firebase on the client side, once per component mount.
      return initializeFirebase();
    } catch (error) {
      // Log error but don't crash the app
      console.error('Failed to initialize Firebase:', error);
      // Return null services - components should handle this gracefully
      return {
        firebaseApp: null,
        auth: null,
        firestore: null,
        messaging: null,
      };
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      messaging={firebaseServices.messaging}
    >
      {children}
    </FirebaseProvider>
  );
}
