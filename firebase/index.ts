import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

// Import hooks first
import {
  FirebaseProvider as _FirebaseProvider,
  useFirebase as _useFirebase,
  useAuth as _useAuth,
  useFirestore as _useFirestore,
  useFirebaseApp as _useFirebaseApp,
  useMessaging as _useMessaging,
  useMemoFirebase as _useMemoFirebase,
  useUser as _useUser,
} from './provider';

import { useCollection as _useCollection } from './firestore/use-collection';
import { useDoc as _useDoc } from './firestore/use-doc';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    // Important! initializeApp() is called without any arguments because Firebase App Hosting
    // integrates with the initializeApp() function to provide the environment variables needed to
    // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
    // without arguments.
    let firebaseApp;
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Only warn in production because it's normal to use the firebaseConfig to initialize
      // during development
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const isBrowser = typeof window !== 'undefined';
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    messaging: isBrowser ? getMessaging(firebaseApp) : null,
  };
}

// Re-export with original names using export statements
export { _FirebaseProvider as FirebaseProvider };
export { _useFirebase as useFirebase };
export { _useAuth as useAuth };
export { _useFirestore as useFirestore };
export { _useFirebaseApp as useFirebaseApp };
export { _useMessaging as useMessaging };
export { _useMemoFirebase as useMemoFirebase };
export { _useUser as useUser };
export { _useCollection as useCollection };
export { _useDoc as useDoc };

// Re-export types
export type {
  FirebaseContextState,
  FirebaseServicesAndUser,
  UserHookResult,
} from './provider';

export type {
  UseCollectionResult,
  WithId,
} from './firestore/use-collection';

export type {
  UseDocResult,
} from './firestore/use-doc';

// Re-export other modules
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

// Note: FirebaseClientProvider is NOT exported here to avoid circular dependency
// Import it directly: import { FirebaseClientProvider } from '@/firebase/client-provider'
