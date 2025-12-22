# Quick Start: Native App Setup

Get your Daily Connect app running on iOS and Android in minutes!

## ⚡ Quick Setup (5 minutes)

### 1. Upgrade Node.js (if needed)

Capacitor requires Node 22+:
```bash
node --version  # Check your version
nvm install 22 && nvm use 22  # If you need to upgrade
```

### 2. Run Setup Script

```bash
./scripts/setup-capacitor.sh
```

Or manually:
```bash
npm run build
npm run cap:add:ios      # macOS only
npm run cap:add:android
npm run cap:sync
```

### 3. Open in Native IDE

**iOS (macOS only):**
```bash
npm run cap:open:ios
```
Then click the Play button in Xcode to run on simulator or device.

**Android:**
```bash
npm run cap:open:android
```
Then click the Run button in Android Studio.

## 🚀 Development with Live Reload

1. **Start dev server on your network:**
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

Now changes in your Next.js app will hot-reload in the native app!

## 📱 Building for Production

### iOS App Store

1. Open in Xcode: `npm run cap:open:ios`
2. Select your development team
3. Product → Archive
4. Follow App Store Connect workflow

### Android Play Store

1. Open in Android Studio: `npm run cap:open:android`
2. Build → Generate Signed Bundle / APK
3. Follow Play Console workflow

## ⚙️ Configuration

- **App ID**: `com.dailyconnect.app` (change in `capacitor.config.ts`)
- **App Name**: "Daily Connect" (change in `capacitor.config.ts`)
- **Icons**: Replace in `ios/App/App/Assets.xcassets/` and `android/app/src/main/res/`

## 🐛 Troubleshooting

**"NodeJS >=22.0.0 required"**
- Upgrade Node: `nvm install 22 && nvm use 22`

**iOS build fails**
- Install Xcode Command Line Tools: `xcode-select --install`
- Install CocoaPods: `sudo gem install cocoapods`
- Run `pod install` in `ios/App`

**Android build fails**
- Install Android Studio and SDK
- Set `ANDROID_HOME` environment variable
- Accept licenses: `sdkmanager --licenses`

**Changes not appearing**
- Run `npm run cap:sync` after making changes

## 📚 Full Documentation

See [NATIVE_APP_SETUP.md](./NATIVE_APP_SETUP.md) for detailed instructions.

