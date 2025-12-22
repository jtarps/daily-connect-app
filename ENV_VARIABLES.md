# Environment Variables Reference

Complete list of all environment variables needed for Daily Connect.

## Required Variables

### Firebase Client Configuration (Required)

These are needed for the app to work at all:

```bash
# Get these from Firebase Console → Project Settings → General → Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX  # Optional, for Analytics
```

### Firebase Admin SDK (Required for Server Actions)

**Choose ONE of these methods:**

**Option 1: JSON String (Recommended for Vercel/Netlify)**
```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```
Get this from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key

**Option 2: File Path (For Local Development)**
```bash
GOOGLE_APPLICATION_CREDENTIALS=./path/to/serviceAccountKey.json
```

## Optional Variables

### Push Notifications (VAPID Key)

Currently hardcoded in `firebase/config.ts`. To use env variable, update the file:

```bash
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key-here
```

Get this from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates

### App URL (For Email/SMS Invitations)

```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```
Defaults to `https://daily-connect-app.vercel.app` if not set.

### Email Service (Optional - for Email Invitations)

```bash
EMAIL_SERVICE_URL=https://api.resend.com/emails  # or your email service
EMAIL_API_KEY=your-email-api-key
```

**Services you can use:**
- Resend: https://resend.com
- SendGrid: https://sendgrid.com
- AWS SES: https://aws.amazon.com/ses/

### SMS Service (Optional - for SMS Invitations)

```bash
SMS_SERVICE_URL=https://api.twilio.com/2010-04-01/Accounts/.../Messages.json
SMS_API_KEY=your-sms-api-key
```

**Services you can use:**
- Twilio: https://twilio.com
- AWS SNS: https://aws.amazon.com/sns/

### WhatsApp Service (Optional - for WhatsApp Invitations)

```bash
WHATSAPP_SERVICE_URL=https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages
WHATSAPP_API_KEY=your-whatsapp-api-key
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
```

**Services you can use:**
- Meta WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
- Twilio WhatsApp: https://www.twilio.com/whatsapp

## Complete .env.local Example

```bash
# ============================================
# REQUIRED - Firebase Client Config
# ============================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# ============================================
# REQUIRED - Firebase Admin (Server Actions)
# ============================================
# Option 1: JSON String (Recommended)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"..."}'

# OR Option 2: File Path
# GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json

# ============================================
# OPTIONAL - Push Notifications
# ============================================
# Update firebase/config.ts to use this instead of hardcoded value
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# ============================================
# OPTIONAL - App Configuration
# ============================================
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# ============================================
# OPTIONAL - Email Service
# ============================================
EMAIL_SERVICE_URL=https://api.resend.com/emails
EMAIL_API_KEY=re_xxxxxxxxxxxxx

# ============================================
# OPTIONAL - SMS Service
# ============================================
SMS_SERVICE_URL=https://api.twilio.com/2010-04-01/Accounts/ACxxxxx/Messages.json
SMS_API_KEY=your-twilio-auth-token

# ============================================
# OPTIONAL - WhatsApp Service
# ============================================
WHATSAPP_SERVICE_URL=https://graph.facebook.com/v18.0/PHONE_NUMBER_ID/messages
WHATSAPP_API_KEY=your-meta-access-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
```

## Where to Get These Values

### Firebase Client Config
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Project Settings (gear icon) → General tab
4. Scroll to "Your apps" section
5. Click on your web app or create one
6. Copy the config values

### Firebase Service Account Key
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download JSON file
4. Copy entire JSON content as a string for `FIREBASE_SERVICE_ACCOUNT_KEY`

### VAPID Key
1. Firebase Console → Project Settings → Cloud Messaging
2. Scroll to "Web Push certificates"
3. Generate new key pair or copy existing
4. Use the public key as `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

## Notes

- ⚠️ **Never commit** `.env.local` to Git (already in `.gitignore`)
- ⚠️ **Never commit** service account JSON files
- ✅ All `NEXT_PUBLIC_*` variables are exposed to the browser
- ✅ Variables without `NEXT_PUBLIC_` are server-only (more secure)
- ✅ Optional services will log to console if not configured (won't break the app)

