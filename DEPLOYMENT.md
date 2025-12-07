# Deployment Checklist

## Pre-Deployment Requirements

### 1. Firebase Admin SDK Setup

The reminder feature requires Firebase Admin SDK credentials. You need to:

1. **Get Service Account Key:**

   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download the JSON file

2. **Set Environment Variable:**

   - For **local development**: Create `.env.local` file:

     ```
     FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
     ```

     (Paste the entire JSON content as a string)

   - For **production** (Vercel/Netlify/etc.):
     - Add `FIREBASE_SERVICE_ACCOUNT_KEY` as an environment variable
     - Paste the entire JSON content as a string

### 2. Firebase Configuration

- ✅ Firestore Security Rules deployed
- ✅ Firebase project ID configured
- ⚠️ VAPID_KEY needs to be set in `firebase/config.ts` for push notifications

### 3. Environment Variables Needed

```
# Firebase Client Config (already in config.ts)
FIREBASE_PROJECT_ID=studio-9081894834-5f9ce

# Firebase Admin SDK (for server actions)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Push Notifications
VAPID_KEY=your-vapid-key-here
```

### 4. Build & Test

```bash
npm run build
npm start
```

### 5. Deploy Options

#### Option A: Vercel (Recommended for Next.js)

1. Push code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

#### Option B: Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

#### Option C: Other Platforms

- Netlify
- Railway
- Render
- Any Node.js hosting platform

## Current Status

✅ **Ready:**

- App builds successfully
- All imports fixed
- Firebase client configured
- Firestore rules deployed
- Authentication working
- Check-in functionality
- Circle management
- Invitations

⚠️ **Needs Setup:**

- Firebase Admin SDK credentials (for reminders)
- VAPID key for push notifications
- Production environment variables

❌ **Not Ready:**

- PWA features (manifest, service worker) - user requested but not implemented yet

## Testing Checklist

- [ ] Sign up new user
- [ ] Create circle
- [ ] Invite members by email
- [ ] Accept invitation
- [ ] Check in
- [ ] View friend statuses
- [ ] Send reminder (requires Admin SDK setup)
- [ ] Switch between circles
- [ ] Forgot password flow
