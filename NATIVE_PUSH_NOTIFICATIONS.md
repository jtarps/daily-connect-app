# Native Push Notifications Setup

## Current Status

Currently, the app uses **web push notifications** (Firebase Cloud Messaging) which work in browsers and PWAs, but **not in native Capacitor apps**.

For native apps, we need to use **Capacitor Push Notifications plugin** which integrates with:

- **iOS**: Apple Push Notification service (APNs)
- **Android**: Firebase Cloud Messaging (FCM) for native apps

## Why Native Push Notifications?

- **Better reliability**: Native push works even when the app is closed
- **Better UX**: Native notifications feel more integrated
- **No cookie issues**: Native apps don't have the same cookie/storage issues as PWAs
- **Better performance**: Direct integration with OS notification systems

## Implementation Plan

### Step 1: Install Capacitor Push Notifications Plugin

```bash
npm install @capacitor/push-notifications
npx cap sync
```

### Step 2: Configure iOS (APNs)

1. **Get APNs Key from Apple Developer:**

   - Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
   - Create a new key with "Apple Push Notifications service (APNs)" enabled
   - Download the `.p8` key file

2. **Upload to Firebase:**

   - Go to Firebase Console → Project Settings → Cloud Messaging
   - Under "Apple app configuration", upload the APNs key
   - Enter your Team ID and Key ID

3. **Update Xcode:**
   - Open the iOS project in Xcode
   - Enable Push Notifications capability
   - Add Background Modes → Remote notifications

### Step 3: Configure Android (FCM)

Android is easier - Firebase handles it automatically:

- The existing FCM setup should work
- Just need to add the plugin and request permissions

### Step 4: Update Code

We'll need to:

1. Create a native push notification service
2. Request permissions using Capacitor API
3. Get device tokens from Capacitor (not Firebase directly)
4. Store tokens in Firestore (same structure)
5. Update the notification sending code to use native tokens

### Step 5: Update Notification Components

- Update `NotificationManager` to use Capacitor API in native apps
- Update `NotificationSettings` to show native notification status
- Keep web push for browser/PWA versions

## Current Issues Fixed

✅ **Firestore Security Rules**: Fixed to allow checking if friends have notifications enabled
✅ **Hydration Error**: Fixed by checking `isMounted` before rendering
✅ **Environment Variables**: Improved error messages for native apps

## Next Steps

1. Install the plugin: `npm install @capacitor/push-notifications`
2. Configure APNs in Firebase Console
3. Update code to use Capacitor Push Notifications API
4. Test on both iOS and Android

## Resources

- [Capacitor Push Notifications Docs](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging for iOS](https://firebase.google.com/docs/cloud-messaging/ios/client)
- [Firebase Cloud Messaging for Android](https://firebase.google.com/docs/cloud-messaging/android/client)
