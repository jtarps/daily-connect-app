# Notification Features - User Guide

## ✅ What's New

We've added comprehensive notification management features so users can easily enable notifications and you can see who has them enabled.

## Features

### 1. Notification Settings Dialog

**How to access:**
- Click the **Bell icon** (🔔) in the top-right header
- A dialog opens showing your notification status

**What you can do:**
- See if notifications are enabled
- Enable notifications if they're disabled
- View registered devices (FCM tokens)
- Remove device tokens if needed
- See helpful status messages

### 2. Visual Indicators in Circle View

**In the circle member list:**
- **Green "Notifications" badge** = User has notifications enabled
- **Gray "No Notifications" badge** = User hasn't enabled notifications yet
- **Helpful message** = Shows when reminders can't be sent because notifications aren't enabled

### 3. Improved Notification Prompt

**The floating notification prompt:**
- Shows when you first use the app
- Can be dismissed (X button)
- Can be re-enabled later via the Bell icon
- Less intrusive if notifications are blocked

## For Users: How to Enable Notifications

### Step 1: Click the Bell Icon
Click the bell icon (🔔) in the top-right corner of the app header.

### Step 2: Enable Notifications
In the dialog that opens:
1. Click "Enable Notifications" button
2. Allow notifications in your browser's permission prompt
3. You'll see a success message

### Step 3: Verify
- You should see a green "Enabled" badge in the dialog
- Your device will be listed under "Registered Devices"
- You'll now receive:
  - Reminders when circle members check in
  - Gentle reminders if you haven't checked in today

## For Developers: Troubleshooting

### "No FCM tokens found for user [name]"

**Cause:** The user hasn't enabled notifications yet.

**Solution:**
1. Tell the user to click the Bell icon in the header
2. They need to enable notifications in the dialog
3. Once enabled, FCM tokens will be saved to Firestore

### User can't find notification settings

**Solution:**
- The Bell icon is always visible in the header (top-right)
- If they dismissed the initial prompt, they can still access settings via the Bell icon
- The dialog shows current status and allows enabling/disabling

### Notifications not working on iOS native app

**Note:** Web push notifications work in:
- ✅ Browser (Safari, Chrome, Firefox)
- ✅ PWA (Progressive Web App)
- ❌ Native iOS app (Capacitor WebView)

For native iOS apps, you'll need to use:
- Capacitor Push Notifications plugin
- Or native iOS push notifications via APNs

## Technical Details

### FCM Token Storage
- Tokens are stored in: `users/{userId}/fcmTokens/{tokenId}`
- Each device gets its own token
- Tokens are automatically registered when notifications are enabled

### Notification Status Check
The app checks for FCM tokens to determine if notifications are enabled:
- If tokens exist → Notifications enabled ✅
- If no tokens → Notifications not enabled ❌

### Reminder Flow
1. User clicks "Remind" button
2. System checks for recipient's FCM tokens
3. If tokens exist → Send push notification
4. If no tokens → Show helpful error message

## CRON_SECRET Explained

**What is it?**
A security token that protects your cron job endpoint from unauthorized access.

**Do I need it?**
- **Optional** but **recommended** for production
- If not set, cron jobs still work but aren't protected

**How to set it up:**
1. Generate a random secret:
   ```bash
   openssl rand -hex 32
   ```
2. Add to Vercel environment variables as `CRON_SECRET`
3. The cron endpoint will automatically use it

**Why use it?**
- Prevents random people from triggering your cron jobs
- Adds a layer of security to scheduled tasks
- Vercel includes it in the Authorization header when calling cron jobs

## Next Steps for iOS/Android Native Apps

### Current Status
- ✅ Web push notifications work in browser/PWA
- ❌ Web push doesn't work in native Capacitor apps

### For Native Apps
You'll need to implement native push notifications:

**iOS:**
- Use Capacitor Push Notifications plugin
- Configure APNs (Apple Push Notification service)
- Update notification handling code

**Android:**
- Use Capacitor Push Notifications plugin
- Configure FCM for Android
- Similar setup to iOS

The good news: Once you set up native push for iOS, Android setup is very similar!

## Summary

✅ **Users can now:**
- Easily enable notifications via Bell icon
- See their notification status
- Understand why reminders might not work

✅ **You can now:**
- See who has notifications enabled in circle view
- Get helpful error messages when reminders fail
- Have a clear path for users to enable notifications

✅ **System:**
- Automatically registers FCM tokens
- Shows visual indicators for notification status
- Provides helpful error messages

