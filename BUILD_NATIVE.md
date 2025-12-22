# Build for Native Apps - Final Steps

You're almost ready! Just a few final steps to sync your app to iOS and Android.

## ⚠️ Important: Switch to Node 22 First

Capacitor requires Node 22+. In your terminal:

```bash
nvm use 22
# or
nvm use 22.21.1
```

Verify:

```bash
node --version
# Should show: v22.x.x
```

**If you get "command not found: nvm"**, you may need to:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22
```

Or add this to your `~/.zshrc` to load nvm automatically.

## Step 1: Sync to Native Platforms

**Make sure you're on Node 22 first!** (See above)

For development, you'll use live reload (see Development Workflow below), so you don't need to build first.

```bash
npm run cap:sync
```

This syncs Capacitor configuration and prepares the native projects.

**Note:** A placeholder `index.html` has been created in `public/` for Capacitor. When using `server.url` in development, the app will load from your Next.js server instead of this file.

Or manually:

```bash
npx cap sync
```

## Step 3: Open in Native IDEs

### For iOS (macOS only):

```bash
npm run cap:open:ios
```

This opens Xcode. Then:

1. Select a simulator or connected device
2. Click the Play button (▶️) to run
3. Or Product → Archive to build for App Store

### For Android:

```bash
npm run cap:open:android
```

This opens Android Studio. Then:

1. Wait for Gradle sync to complete
2. Select a device/emulator
3. Click Run (▶️) button
4. Or Build → Generate Signed Bundle / APK for release

## Development Workflow

### Option A: Live Reload (Recommended for Development)

**This is the easiest way to develop!**

1. **Start your dev server:**

   ```bash
   npm run dev:network
   ```

   Note your IP address (e.g., `192.168.1.100`)

2. **Update `capacitor.config.ts`:**

   ```typescript
   server: {
     url: 'http://192.168.1.100:3000',
     cleartext: true
   }
   ```

3. **Sync and run:**
   ```bash
   npm run cap:sync
   npm run cap:open:ios  # or android
   ```

Now changes will hot-reload in the native app!

### Option B: Build Each Time

1. Make changes to your Next.js app
2. Run `npm run build`
3. Run `npm run cap:sync`
4. Run the app from Xcode/Android Studio

## Current Status ✅

- ✅ Capacitor installed and configured
- ✅ iOS platform initialized
- ✅ Android platform initialized
- ✅ Build scripts ready
- ✅ Next.js app built successfully

## Next Steps After Opening in Xcode/Android Studio

### iOS:

1. **Configure Signing:**

   - Select your project in Xcode
   - Go to "Signing & Capabilities"
   - Select your development team
   - Xcode will automatically manage certificates

2. **Test on Simulator:**

   - Select a simulator (e.g., iPhone 15)
   - Click Play button

3. **Test on Device:**
   - Connect your iPhone via USB
   - Select your device
   - Click Play (may need to trust developer certificate on device)

### Android:

1. **Configure SDK:**

   - Android Studio will prompt to install missing SDK components
   - Accept and wait for installation

2. **Test on Emulator:**

   - Create/select an emulator
   - Click Run

3. **Test on Device:**
   - Enable USB debugging on your Android device
   - Connect via USB
   - Click Run

## Troubleshooting

**"NodeJS >=22.0.0 required"**

- Run `nvm use 22` first

**Build fails in Xcode:**

- Make sure CocoaPods are installed: `cd ios/App && pod install`
- Clean build folder: Product → Clean Build Folder

**Build fails in Android Studio:**

- Make sure Android SDK is installed
- Accept licenses: `sdkmanager --licenses`
- Sync Gradle: File → Sync Project with Gradle Files

**App doesn't load:**

- Check `capacitor.config.ts` - make sure `webDir` points to correct location
- For production, you may need to set `server.url` to your deployed Next.js app

## Production Build

For production, you have two options:

### Option 1: Deploy Next.js and Point to It

1. Deploy your Next.js app (Vercel, etc.)
2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'https://your-app.vercel.app',
   }
   ```
3. Sync: `npm run cap:sync`
4. Build in Xcode/Android Studio

### Option 2: Static Export (Advanced)

Requires converting server actions to API routes. See `NATIVE_APP_SETUP.md` for details.

---

**You're ready! Run the commands above to open in Xcode/Android Studio.** 🚀
