# Troubleshooting Reminders Not Appearing

## Quick Checklist

If reminders say "sent" but the recipient doesn't get them:

### 1. Check if Recipient Has Notifications Enabled
- Look for the green "Notifications" badge on their friend card
- If you see gray "No Notifications" badge, they need to enable it
- They need to click the bell icon (🔔) in the header and grant permission

### 2. Check Browser Console (For Testing)
Open browser console (F12) and look for:
- `FCM Token: ...` - confirms token was generated
- `Foreground message received.` - confirms notification was received
- Any error messages about service workers or permissions

### 3. Check Browser Notification Permissions
- **Chrome/Edge**: Settings → Privacy and security → Site Settings → Notifications
- **Firefox**: Settings → Privacy & Security → Permissions → Notifications
- **Safari**: Settings → Websites → Notifications
- Make sure the site is allowed to send notifications

### 4. Verify FCM Token Exists in Firestore
1. Go to Firebase Console → Firestore Database
2. Navigate to: `users/{recipientUserId}/fcmTokens`
3. Check if there are any token documents
4. If empty, the user hasn't enabled notifications

### 5. Test Notification Delivery
Use the test endpoint to verify notifications work:
```bash
POST /api/test-notification
Body: { "userId": "recipient-user-id" }
```

This will send a test notification and show detailed delivery status.

## Common Issues

### "Reminder Sent" but No Notification Appears

**Possible causes:**
1. **Browser blocking notifications** - Check browser notification settings
2. **Service worker not registered** - Refresh the page, check console for errors
3. **Invalid/expired FCM token** - User needs to re-enable notifications
4. **App is in foreground** - Notifications appear as toast, not push notification
5. **Native app** - Web push doesn't work in native apps (need native push)

### How to Verify Delivery

The improved code now checks FCM response and will tell you:
- ✅ "Reminder sent! They should receive it on their device(s) shortly."
- ⚠️ "Reminder sent (1 device received it, 1 failed)" - Some devices failed
- ❌ "Failed to send reminder" - All devices failed

### Testing Steps

1. **Sender side:**
   - Click "Send Reminder"
   - Check the message - it should be more specific now
   - Check browser console for FCM response details

2. **Recipient side:**
   - Make sure notifications are enabled (bell icon)
   - Check browser notification permissions
   - Open browser console to see if notification was received
   - If app is open, look for toast notification at top
   - If app is closed, check system notifications

3. **Both sides:**
   - Check Firestore: `users/{uid}/fcmTokens` should have token documents
   - Check browser console for any errors

## Debugging Commands

### Check if user has notifications enabled:
```javascript
// In browser console on recipient's device
firebase.firestore().collection('users').doc('USER_ID').collection('fcmTokens').get()
  .then(snap => console.log('Tokens:', snap.size));
```

### Check notification permission:
```javascript
// In browser console
Notification.permission // Should be "granted"
```

### Check service worker:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => console.log('Service workers:', regs));
```

## Next Steps

If notifications still don't work after checking all of the above:
1. Have the recipient re-enable notifications (disable and re-enable)
2. Check if they're using a supported browser (Chrome, Firefox, Edge work best)
3. Try on a different device/browser
4. Check Vercel logs for FCM errors
5. Verify VAPID key is correct in environment variables
