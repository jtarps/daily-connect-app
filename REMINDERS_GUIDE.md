# Reminders Guide - How They Work

## Overview

Reminders are **push notifications** sent to users to encourage them to check in. They appear as browser/system notifications, just like notifications from other apps.

## Two Types of Reminders

### 1. Manual Reminders (On-Demand)
- **When**: A user clicks the "Send Reminder" button on a friend's card in the Circle view
- **Who receives**: The specific friend who hasn't checked in
- **What it says**: 
  - Title: "Your circle is thinking of you! 👋"
  - Body: "[SenderName] is thinking of you! Don't forget to check in today."
- **Action**: Clicking the notification opens the app to the check-in page

### 2. Automatic Daily Reminders (Cron Job)
- **When**: Daily at 9 AM UTC (configured in `vercel.json`)
- **Who receives**: All circle members who haven't checked in today
- **What it says**: Same as manual reminders
- **How it works**: 
  - The cron job runs automatically
  - Checks all circles
  - Finds members who haven't checked in today
  - Sends reminders to those who have notifications enabled

## How Reminders Appear

### When the App is Closed (Background)
- Appears as a **system/browser push notification**
- Shows on your phone/computer like any other notification
- Includes:
  - App icon (Daily Connect icon)
  - Title: "Your circle is thinking of you! 👋"
  - Message: "[SenderName] is thinking of you! Don't forget to check in today."
  - Clicking opens the app to the check-in page

### When the App is Open (Foreground)
- Appears as a **toast notification** at the top of the screen
- Same content as background notifications
- Less intrusive - doesn't block the screen

## Requirements for Reminders to Work

### For Recipients:
1. ✅ Must have **notifications enabled** (clicked the bell icon and granted permission)
2. ✅ Must have an **FCM token** stored in Firestore (happens automatically when notifications are enabled)
3. ✅ Must be using a **browser or PWA** (web push doesn't work in native apps yet)

### For Senders:
- No special setup needed
- Just click "Send Reminder" button on a friend's card

## What You'll See

### In the App (When Sending):
- **Success**: "Reminder Sent! A friendly reminder has been sent to [Name]."
- **Failure**: "Reminder Failed. [Name] hasn't enabled notifications yet. They can enable them by clicking the bell icon in the app header."

### On Recipient's Device:
- **Push notification** (if app is closed)
- **Toast notification** (if app is open)
- **Clicking notification** opens the app to the check-in page

## Testing Reminders

### To Test Manually:
1. Make sure you have notifications enabled (bell icon in header)
2. Have a friend send you a reminder (or send one to yourself from another account)
3. Check your device for the notification

### To Test Automatic Reminders:
1. Don't check in for a day
2. Wait for the cron job to run (9 AM UTC daily)
3. Or manually trigger it: Visit `/api/cron/reminders` (requires `CRON_SECRET` if configured)

## Troubleshooting

### "Reminder Failed - Notifications Not Enabled"
- The recipient needs to click the bell icon and enable notifications
- They need to grant browser permission when prompted

### "No FCM tokens found"
- The user hasn't enabled notifications yet
- They need to enable notifications in the app

### Notifications Not Appearing
1. Check browser notification permissions (Settings → Site Settings → Notifications)
2. Make sure notifications are enabled in the app (bell icon)
3. Check that the service worker is registered (check browser console)
4. Try refreshing the page

### Notifications Work in Browser but Not PWA
- This is expected - PWA notifications work the same as browser notifications
- Make sure you've installed the PWA and granted permissions

## Current Limitations

- ⚠️ **Native apps**: Web push notifications don't work in native iOS/Android apps
  - Solution: Need to implement native push notifications (see `NATIVE_PUSH_NOTIFICATIONS.md`)
- ⚠️ **Safari on iOS**: May have limited support for web push
  - Solution: Use Chrome/Firefox on iOS, or implement native push

## Next Steps

If you want reminders to work in native apps:
1. See `NATIVE_PUSH_NOTIFICATIONS.md` for setup instructions
2. Install Capacitor Push Notifications plugin
3. Configure APNs (iOS) and FCM (Android)
4. Update the notification code to handle native tokens
