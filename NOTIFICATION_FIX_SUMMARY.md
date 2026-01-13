# Notification Fix Summary

## Issues Fixed

### 1. ✅ Firestore Security Rules
- **Problem**: Couldn't check if friends have notifications enabled (accessing their `fcmTokens`)
- **Fix**: Updated rules to allow signed-in users to list `fcmTokens` (to check notification status) without exposing token values

### 2. ✅ Missing Firebase Messaging Service Worker
- **Problem**: Notifications weren't working because there was no service worker to handle background push notifications
- **Fix**: 
  - Created `/public/firebase-messaging-sw.js` - handles background push notifications
  - Updated Firebase initialization to register the service worker
  - Updated `next.config.js` to serve the service worker correctly

### 3. ✅ Hydration Error
- **Problem**: Server/client mismatch causing React hydration errors
- **Fix**: Added `isMounted` check in `NotificationManager` to prevent rendering during SSR

## What You Need to Verify

### 1. Check Your Environment Variables

Make sure your `.env.local` file has **all** the Firebase config values from your Firebase Studio project:

```bash
# Client-side Firebase config (NEXT_PUBLIC_* = exposed to browser)
# These should match your Firebase Studio project
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDnlC_BLls5QxyoE-8TY7ZsIf4BhSu8aIs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=studio-9081894834-5f9ce.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-9081894834-5f9ce
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=9321679669
NEXT_PUBLIC_FIREBASE_APP_ID=1:9321679669:web:876fb18f2cbbe1759c9a7c

# IMPORTANT: VAPID Key for web push notifications
# Get the PUBLIC KEY PAIR (not the private key!) from Firebase Console
# Firebase Console → Project Settings → Cloud Messaging → Web Push certificates → Key pair
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-public-key-pair-here

# Server-side Firebase Admin SDK (for sending notifications, etc.)
# This is the JSON string from your service account key file
# Get it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"studio-9081894834-5f9ce",...}'
```

### 2. Get Your VAPID Key

The VAPID key is **required** for web push notifications to work:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `studio-9081894834-5f9ce`
3. Click the gear icon → **Project Settings**
4. Go to the **Cloud Messaging** tab
5. Scroll to **"Web Push certificates"** section
6. If you don't have one, click **"Generate key pair"**
7. Copy the **Key pair** (this is the PUBLIC key - starts with `B...` or similar)
   - ⚠️ **IMPORTANT**: Use the **PUBLIC KEY PAIR**, NOT the private key!
   - The public key is what you need for `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
8. Add it to `.env.local` as `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

**Note**: If you were using the private key before, that's why notifications weren't working! The VAPID key must be the public key pair.

### 3. Restart Your Dev Server

After updating `.env.local`:
```bash
# Stop your current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### 4. Test Notifications

1. **Open the app in a browser** (not the native app - web push doesn't work there)
2. **Log in**
3. **Click "Enable Notifications"** when prompted
4. **Check the browser console** - you should see:
   - `Firebase Messaging service worker registered: ...`
   - `FCM Token: ...` (a long string)
5. **Check Firestore** - you should see a document at:
   - `users/{your-uid}/fcmTokens/{token-id}`

### 5. Test Sending a Notification

1. Have two users in a circle
2. User A enables notifications (gets FCM token)
3. User B checks in
4. User A should receive a push notification: "{User B} checked in! ✅"

## About Firebase Studio vs Your Current Setup

**You're correct** - the app was originally built in Firebase Studio, but:

- ✅ **The backend IS connected correctly** - you're using the same Firebase project (`studio-9081894834-5f9ce`)
- ✅ **The service account key** (`studio-9081894834-5f9ce-firebase-adminsdk-fbsvc-a523a2a1c0.json`) is for the same project
- ✅ **All the config values** should match what Firebase Studio generated

The issue wasn't the project connection - it was:
1. Missing service worker for handling push notifications
2. Missing/incorrect VAPID key
3. Security rules blocking friend notification status checks

## Next Steps

Once notifications work in the browser/PWA:

1. **For Native Apps**: We need to implement native push notifications (see `NATIVE_PUSH_NOTIFICATIONS.md`)
2. **For Production**: Make sure to add the VAPID key to Vercel environment variables

## Troubleshooting

If notifications still don't work:

1. **Check browser console** for errors
2. **Verify VAPID key** is set correctly in `.env.local`
3. **Check service worker registration** - look for "Firebase Messaging service worker registered" in console
4. **Verify FCM token** is being saved to Firestore
5. **Check browser notification permissions** - make sure they're not blocked

## Common Issues

- **"Missing required environment variable"**: Restart your dev server after updating `.env.local`
- **"VAPID key is invalid"**: 
  - Make sure you're using the **PUBLIC KEY PAIR** (not the private key!)
  - The public key usually starts with `B...` or similar
  - Make sure you copied the entire key from Firebase Console
- **"Service worker registration failed"**: Make sure you're testing in a browser (not native app) and using HTTPS or localhost
- **"Notifications not showing"**: Check browser notification permissions in browser settings
- **"FIREBASE_SERVICE_ACCOUNT_KEY missing"**: This is needed for server-side operations (sending notifications). Get it from Firebase Console → Project Settings → Service Accounts → Generate New Private Key