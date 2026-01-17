
'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
// Import initializeFirebase directly to avoid circular dependency issues
// We can't import from '@/firebase' because that would create a circular dependency
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// Local copy of initializeFirebase to avoid circular dependency
async function initializeFirebase() {
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
      // In the browser, prioritize process.env.NEXT_PUBLIC_* (Next.js bundles these at build time)
      // Only fall back to firebaseConfig if process.env is not available
      const missingVars: string[] = [];
      
      // In browser, process.env.NEXT_PUBLIC_* should be available (Next.js replaces them at build time)
      // In browser, we should ONLY use process.env, not firebaseConfig (which may have empty strings from import time)
      const isBrowser = typeof window !== 'undefined';
      const envVars = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (isBrowser ? '' : firebaseConfig.apiKey),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || (isBrowser ? '' : firebaseConfig.projectId),
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || (isBrowser ? '' : firebaseConfig.appId),
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || (isBrowser ? '' : firebaseConfig.authDomain),
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || (isBrowser ? '' : firebaseConfig.messagingSenderId),
      };

      // Log detailed debug info
      console.log('Firebase initialization - checking env vars:', {
        'process.env.NEXT_PUBLIC_FIREBASE_API_KEY': process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? `${process.env.NEXT_PUBLIC_FIREBASE_API_KEY.substring(0, 10)}...` : 'NOT SET',
        'process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID': process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET',
        'process.env.NEXT_PUBLIC_FIREBASE_APP_ID': process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'NOT SET',
        'process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN': process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'NOT SET',
        'process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID': process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'NOT SET',
        'firebaseConfig.apiKey': firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : 'EMPTY',
        'firebaseConfig.projectId': firebaseConfig.projectId || 'EMPTY',
        'envVars.apiKey': envVars.apiKey ? `${envVars.apiKey.substring(0, 10)}...` : 'EMPTY',
        'envVars.projectId': envVars.projectId || 'EMPTY',
        'isBrowser': isBrowser,
      });

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
        console.error('Firebase initialization error:', error);
        console.error('Missing variables:', missingVars);
        console.error('Env vars state:', {
          apiKey: envVars.apiKey ? 'present' : 'missing',
          projectId: envVars.projectId ? 'present' : 'missing',
          appId: envVars.appId ? 'present' : 'missing',
          authDomain: envVars.authDomain ? 'present' : 'missing',
          messagingSenderId: envVars.messagingSenderId ? 'present' : 'missing',
        });
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
    // Only initialize messaging if service workers are supported (not in Capacitor WebView)
    let messaging = null;
    if (isBrowser) {
      try {
        // Check if service workers are available before initializing messaging
        if ('serviceWorker' in navigator && navigator.serviceWorker !== undefined) {
          // Try to get existing service worker registration first
          const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
          let registration = existingRegistration;
          
          // If no existing registration, register a new one
          if (!registration) {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
              scope: '/',
            });
            console.log('Firebase Messaging service worker registered:', registration);
          } else {
            console.log('Firebase Messaging service worker already registered:', registration);
          }
          
          // Initialize messaging
          // Note: getMessaging() doesn't take serviceWorkerRegistration as a parameter
          // The service worker registration is handled automatically when registered
          messaging = getMessaging(firebaseApp);
        } else {
          console.warn('Firebase Messaging: Service workers not available (likely in Capacitor WebView). Messaging will be disabled.');
        }
      } catch (error) {
        console.warn('Firebase Messaging: Failed to initialize. This is expected in Capacitor WebView or unsupported browsers.', error);
        messaging = null;
      }
    }
    
    return {
      firebaseApp,
      auth: getAuth(firebaseApp),
      firestore: getFirestore(firebaseApp),
      messaging,
    };
  }

  const app = getApp();
  const isBrowser = typeof window !== 'undefined';
  // Only initialize messaging if service workers are supported (not in Capacitor WebView)
  let messaging = null;
  if (isBrowser) {
    try {
      // Check if service workers are available before initializing messaging
      if ('serviceWorker' in navigator && navigator.serviceWorker !== undefined) {
        // Try to get existing service worker registration first
        const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        let registration = existingRegistration;
        
        // If no existing registration, register a new one
        if (!registration) {
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          });
          console.log('Firebase Messaging service worker registered:', registration);
        } else {
          console.log('Firebase Messaging service worker already registered:', registration);
        }
        
        // Initialize messaging
        // Note: getMessaging() doesn't take serviceWorkerRegistration as a parameter
        // The service worker registration is handled automatically when registered
        messaging = getMessaging(app);
      } else {
        console.warn('Firebase Messaging: Service workers not available (likely in Capacitor WebView). Messaging will be disabled.');
      }
    } catch (error) {
      console.warn('Firebase Messaging: Failed to initialize. This is expected in Capacitor WebView or unsupported browsers.', error);
      messaging = null;
    }
  }
  
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    messaging,
  };
}

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [firebaseServices, setFirebaseServices] = useState<{
    firebaseApp: FirebaseApp | null;
    auth: any;
    firestore: any;
    messaging: any;
  }>({
    firebaseApp: null,
    auth: null,
    firestore: null,
    messaging: null,
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    // During SSR/build, don't initialize
    if (typeof window === 'undefined') {
      setIsInitializing(false);
      return;
    }

    const initFirebase = async () => {
      setIsInitializing(true);
      setInitError(null);
      
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
        
        // Initialize Firebase on the client side
        const services = await initializeFirebase();
        setFirebaseServices(services);
        setIsInitializing(false);
      } catch (error) {
        // Log error and store it
        console.error('Failed to initialize Firebase:', error);
        const firebaseError = error instanceof Error ? error : new Error(String(error));
        setInitError(firebaseError);
        // Set null services - components should handle this gracefully
        setFirebaseServices({
          firebaseApp: null,
          auth: null,
          firestore: null,
          messaging: null,
        });
        setIsInitializing(false);
      }
    };

    initFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Initializing Firebase...</p>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (initError) {
    const isProduction = process.env.NODE_ENV === 'production';
    const errorMessage = isProduction
      ? 'Firebase core services not available. This usually means Firebase environment variables are missing in Vercel. Please check your Vercel project settings (Settings → Environment Variables) and ensure all NEXT_PUBLIC_FIREBASE_* variables are set: NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID, NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID.'
      : 'Firebase core services not available. Check FirebaseProvider props and ensure all NEXT_PUBLIC_FIREBASE_* environment variables are set in your .env.local file.';
    
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-card border border-destructive rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-4">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

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
