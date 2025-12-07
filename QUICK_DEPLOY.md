# Quick Deployment Guide

## ✅ App is Ready to Deploy!

The app builds successfully and all core features work. Here's how to get it live:

## Option 1: Vercel (Recommended - Easiest for Next.js)

### Steps:

1. **Push to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings
   - Click "Deploy"

3. **Add Environment Variables** (Optional - for reminders):
   - In Vercel dashboard → Project Settings → Environment Variables
   - Add: `FIREBASE_SERVICE_ACCOUNT_KEY` (get from Firebase Console)
   - Note: Reminders won't work without this, but everything else will

4. **Done!** Your app will be live at `your-project.vercel.app`

### What Works Without Setup:
- ✅ User signup/login
- ✅ Check-ins
- ✅ Circles
- ✅ Invitations
- ✅ Friend status viewing
- ✅ Password reset

### What Needs Setup (Optional):
- ⚠️ Reminders (needs `FIREBASE_SERVICE_ACCOUNT_KEY`)
- ⚠️ Push notifications (needs VAPID key)

## Option 2: Firebase Hosting

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login:**
   ```bash
   firebase login
   ```

3. **Initialize Hosting:**
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Use an existing project: Yes
   - Public directory: `.next` (or use default)
   - Configure as single-page app: No
   - Set up automatic builds: No

4. **Note:** Firebase Hosting works best with static exports. For Next.js with SSR, **Vercel is recommended** as it handles Next.js server-side features better.

5. **If using Firebase Hosting anyway:**
   - You may need to configure Next.js for static export
   - Or use Firebase Functions for server-side features

## Option 3: Netlify

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Import from GitHub
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Deploy!

## Testing Your Live App

Once deployed, test:
- [ ] Sign up a new account
- [ ] Create a circle
- [ ] Invite someone by email
- [ ] Check in
- [ ] View friend statuses
- [ ] Switch between circles (if you have multiple)

## Next Steps After Deployment

1. ✅ **Test with friends/family** - Get real user feedback
2. **Add PWA features** - Make it installable
3. **Add contact picker** - First feature update

## Troubleshooting

**Build fails?**
- Check that all dependencies are in `package.json`
- Run `npm install` locally first
- Check build logs in deployment platform

**Firebase errors?**
- Make sure Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Check Firebase project ID matches in config

**Reminders not working?**
- This is expected if you haven't set up `FIREBASE_SERVICE_ACCOUNT_KEY`
- Everything else will work fine without it

