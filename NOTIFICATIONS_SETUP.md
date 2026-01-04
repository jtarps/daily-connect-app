# Notifications Setup Guide

Complete guide for setting up push notifications and backend services for Daily Connect.

## ✅ Current Status

Your service account key format is **correct**! The JSON string with escaped newlines (`\n`) is the proper format for Vercel environment variables.

## Required Setup

### 1. Firebase Service Account Key (✅ Already Correct)

Your `FIREBASE_SERVICE_ACCOUNT_KEY` is properly formatted. You need to:

**For Local Development:**

- Already set in `.env.local` ✅

**For Vercel Production:**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `FIREBASE_SERVICE_ACCOUNT_KEY`
3. Paste your entire JSON string (the one you showed me)
4. Make sure to select **Production**, **Preview**, and **Development** environments
5. Redeploy your app

### 2. VAPID Key for Push Notifications

**Get your VAPID key:**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `studio-9081894834-5f9ce`
3. Project Settings (gear icon) → Cloud Messaging tab
4. Scroll to "Web Push certificates"
5. If you don't have one, click "Generate key pair"
6. Copy the **Key pair** (public key)

**Set it up:**

- **Local:** Add to `.env.local`:

  ```bash
  NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key-here
  ```

- **Vercel:** Add as environment variable `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

### 3. Verify Setup

After setting up both keys:

1. **Test locally:**

   ```bash
   npm run dev
   ```

   - Open the app
   - Click "Enable Notifications" when prompted
   - Check browser console for "FCM Token: ..."
   - Check Firestore: `users/{uid}/fcmTokens/{token}` should exist

2. **Test check-in notification:**
   - Have two users in a circle
   - User A enables notifications
   - User B checks in
   - User A should receive a push notification: "{User B} checked in! ✅"

## How Notifications Work

### Automatic Notifications

1. **Check-in Notifications** (Already Working ✅)
   - When a user checks in, all circle members get notified
   - Triggered automatically in `check-in-card.tsx`
   - Uses `notifyCircleOnCheckIn()` server action

### Scheduled Reminders (Needs Cron Setup)

The app has reminder functions ready, but they need to be triggered by a cron job:

- `sendReminder()` - Send reminder to one user
- `sendRemindersToInactiveMembers()` - Send reminders to all inactive members in a circle

**API Routes Available:**

- `POST /api/reminder` - Send single reminder
- `POST /api/reminders-inactive` - Send reminders to inactive circle members

## Setting Up Scheduled Reminders (Vercel Cron)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This runs daily at 9 AM UTC. Then create the cron endpoint:

**File: `app/api/cron/reminders/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { sendRemindersToInactiveMembers } from "@/app/actions";
import * as admin from "firebase-admin";

export async function GET(request: Request) {
  // Verify this is a cron request (optional but recommended)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = admin.firestore();

    // Get all circles
    const circlesSnapshot = await db.collection("circles").get();

    let totalSent = 0;
    let totalFailed = 0;

    for (const circleDoc of circlesSnapshot.docs) {
      const circleData = circleDoc.data();
      const memberIds = circleData.memberIds || [];

      // For each member, check if they should send reminders
      for (const memberId of memberIds) {
        // Get user data
        const userDoc = await db.collection("users").doc(memberId).get();
        if (!userDoc.exists) continue;

        const userData = userDoc.data();
        const userName = userData?.firstName || userData?.email || "Friend";

        // Send reminders to inactive members in this circle
        const result = await sendRemindersToInactiveMembers({
          circleId: circleDoc.id,
          senderId: memberId,
          senderName: userName,
        });

        if (result.success) {
          totalSent += result.sent || 0;
          totalFailed += result.failed || 0;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${totalSent} reminder(s), ${totalFailed} failed`,
      sent: totalSent,
      failed: totalFailed,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Add to Vercel Environment Variables:**

- `CRON_SECRET` - A random secret string for securing your cron endpoint (optional but recommended)

**What is CRON_SECRET?**

`CRON_SECRET` is a security token that protects your cron endpoint from unauthorized access. When Vercel calls your cron job, it includes this token in the `Authorization` header. This prevents random people from triggering your cron jobs.

**How to set it up:**

1. Generate a random secret:

   ```bash
   openssl rand -hex 32
   ```

   This will output something like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

2. Add to Vercel:

   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `CRON_SECRET` with the generated value
   - Select all environments (Production, Preview, Development)

3. The cron endpoint will automatically use this token for authentication.

**Note:** If you don't set `CRON_SECRET`, the cron endpoint will still work, but it won't be protected. It's recommended to set it for production.

## Testing Notifications

### Test 1: Enable Notifications

1. Open app in browser
2. Click "Enable Notifications" button
3. Allow permission
4. Check console for "FCM Token: ..."
5. Check Firestore: `users/{uid}/fcmTokens/{token}`

### Test 2: Check-in Notification

1. User A and User B in same circle
2. User A enables notifications
3. User B checks in
4. User A should receive: "{User B} checked in! ✅"

### Test 3: Manual Reminder (via API)

```bash
curl -X POST https://your-app.vercel.app/api/reminder \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "user-id-here",
    "senderName": "Test User",
    "recipientName": "Recipient Name"
  }'
```

## Troubleshooting

### "Firebase Admin SDK initialization failed"

- Check `FIREBASE_SERVICE_ACCOUNT_KEY` is set correctly
- Verify JSON is valid (no extra quotes, proper escaping)
- Restart dev server after changing `.env.local`

### "No FCM tokens found"

- User hasn't enabled notifications
- Check browser console for permission errors
- Verify VAPID key is set correctly

### "Messaging: This browser doesn't support..."

- This is normal in Capacitor WebView (native app)
- Push notifications work in browser/PWA mode
- For native apps, consider using Capacitor Push Notifications plugin

### Notifications not received

1. Check browser notification permissions
2. Verify FCM token exists in Firestore
3. Check Vercel function logs for errors
4. Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is set in Vercel

## Next Steps

1. ✅ Set `FIREBASE_SERVICE_ACCOUNT_KEY` in Vercel
2. ✅ Set `NEXT_PUBLIC_FIREBASE_VAPID_KEY` in Vercel
3. ⏳ Create cron job for scheduled reminders (optional)
4. ⏳ Test notifications end-to-end
5. ⏳ Set up email/SMS invitations (optional)

## Optional: Email/SMS/WhatsApp Invitations

The app already has functions for these, but they need service configuration:

- **Email:** Set `EMAIL_SERVICE_URL` and `EMAIL_API_KEY` (e.g., Resend)
- **SMS:** Set `SMS_SERVICE_URL` and `SMS_API_KEY` (e.g., Twilio)
- **WhatsApp:** Set `WHATSAPP_SERVICE_URL`, `WHATSAPP_API_KEY`, `WHATSAPP_PHONE_NUMBER_ID`

See `ENV_VARIABLES.md` for details.
