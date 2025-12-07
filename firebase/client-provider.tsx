
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
  if (!getApps().length) {
    let firebaseApp: FirebaseApp;
    try {
      // Try automatic initialization first (for Firebase Hosting)
      firebaseApp = initializeApp();
    } catch (e) {
      // Fall back to explicit config
      // Validate config before using it
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey.trim() === '') {
        const errorMessage = process.env.NODE_ENV === 'production'
          ? 'Firebase API key is missing. Please check your Vercel environment variables and ensure NEXT_PUBLIC_FIREBASE_API_KEY is set.'
          : 'Firebase API key is missing. Please check your .env.local file and ensure NEXT_PUBLIC_FIREBASE_API_KEY is set. Restart your dev server after adding environment variables.';
        const error = new Error(errorMessage);
        console.error(error);
        throw error;
      }
      
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
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
    try {
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
