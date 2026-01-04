# Troubleshooting Guide

## Firefox XrayWrapper Error

**Error:** `Not allowed to define cross-origin object as property on [Object] or [Array] XrayWrapper`

### What is this?

This is a Firefox-specific security error. It typically appears when:
1. **Browser extensions** try to access cross-origin content (most common)
2. Code tries to set properties on objects from different origins
3. Spread operators are used on objects that Firefox considers cross-origin

### Where you'll see it

The error mentions `content-script.js` which indicates it's coming from a **browser extension**, not your app code.

### How to identify the source

1. Open Firefox DevTools (F12)
2. Go to Console tab
3. Look at the stack trace - it will show which extension is causing it
4. Common culprits:
   - Ad blockers
   - Privacy extensions
   - Password managers
   - Developer tools extensions

### Solutions

**Option 1: Disable extensions (for testing)**
- Go to `about:addons` in Firefox
- Temporarily disable extensions one by one
- Reload your app to see which extension causes it

**Option 2: Ignore it (if it doesn't affect functionality)**
- If the error doesn't break your app, you can ignore it
- It's a warning from Firefox's security system, not necessarily a problem

**Option 3: Report to extension developer**
- If a specific extension causes issues, report it to the extension developer

### Code fixes applied

We've updated the Firestore hooks to use `Object.assign` instead of spread operators, which is more Firefox-compatible:

- `firebase/firestore/use-doc.tsx` - Now uses `Object.assign`
- `firebase/firestore/use-collection.tsx` - Now uses `Object.assign`

This makes the code more compatible with Firefox's XrayWrapper security mechanism.

## Other Common Issues

### Notifications not working

**In native app:**
- Web push notifications don't work in Capacitor WebView
- Use browser or PWA mode instead
- For native apps, you need Capacitor Push Notifications plugin

**In browser:**
- Check browser notification permissions
- Make sure VAPID key is set correctly
- Verify FCM tokens exist in Firestore

### Firebase initialization errors

- Check all `NEXT_PUBLIC_FIREBASE_*` environment variables are set
- Restart dev server after changing `.env.local`
- Verify service account key is correct format (JSON string)

### Build errors

- Run `npm install` to ensure dependencies are up to date
- Clear `.next` folder: `rm -rf .next`
- Check Node.js version matches requirements

