# Environment Variables Setup

## Firebase Admin SDK Credentials

You only need **ONE** of these methods (not both):

### Option 1: FIREBASE_SERVICE_ACCOUNT_KEY (Recommended for Vercel/Netlify)

**Best for:** Production deployments (Vercel, Netlify, etc.)

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. Copy the entire JSON content
5. Set as environment variable:

**Local (.env.local):**
```
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
```

**Production (Vercel/Netlify):**
- Add `FIREBASE_SERVICE_ACCOUNT_KEY` as environment variable
- Paste the entire JSON as a string (keep the quotes)

### Option 2: GOOGLE_APPLICATION_CREDENTIALS (For Local Development)

**Best for:** Local development when you have the JSON file

1. Download the service account JSON file (same as Option 1)
2. Save it in your project (e.g., `serviceAccountKey.json`)
3. Add to `.gitignore` (IMPORTANT - never commit this file!)
4. Set environment variable:

**Local (.env.local):**
```
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
```

**Note:** This method requires the file to exist on the server, which doesn't work well on Vercel/Netlify. Use Option 1 for production.

## Which One Should You Use?

- **For Vercel/Netlify deployment:** Use `FIREBASE_SERVICE_ACCOUNT_KEY` (Option 1)
- **For local development:** Either works, but Option 1 is simpler
- **For Google Cloud:** Either works, but Option 2 is more standard

## Important Notes

- ⚠️ **Never commit** the service account JSON file to Git
- ⚠️ **Never commit** `.env.local` to Git (it's already in `.gitignore`)
- ✅ The code will try Option 1 first, then Option 2, then fall back to default credentials
- ✅ If neither is set, reminders won't work, but everything else will

## Testing

To test if it's working:
1. Set the environment variable
2. Try sending a reminder
3. Check the console logs for any errors

