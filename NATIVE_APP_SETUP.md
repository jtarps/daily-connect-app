# Native App Setup Guide

This guide will help you convert Daily Connect from a PWA to native iOS and Android apps using Capacitor.

## Prerequisites

### Required Software

1. **Node.js 22+** (Capacitor CLI requires Node 22+)
   - Check your version: `node --version`
   - If you have Node 21 or lower, upgrade: `nvm install 22 && nvm use 22`
   - Or download from [nodejs.org](https://nodejs.org/)

2. **For iOS Development:**
   - macOS (required)
   - Xcode (from App Store)
   - CocoaPods: `sudo gem install cocoapods`

3. **For Android Development:**
   - Android Studio ([download](https://developer.android.com/studio))
   - Java Development Kit (JDK) 17 or higher
   - Android SDK (installed via Android Studio)

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Initialize Capacitor Platforms

**Note:** You need Node 22+ for this step. If you don't have it, see the "Alternative Setup" section below.

```bash
# Add iOS platform (macOS only)
npm run cap:add:ios

# Add Android platform
npm run cap:add:android
```

### 3. Configure Capacitor

The Capacitor config is already set up in `capacitor.config.ts`. You can modify it if needed:

- `appId`: Your app's bundle identifier (currently `com.dailyconnect.app`)
- `appName`: Display name (currently "Daily Connect")
- `webDir`: Where the built web app is located (currently `out`)

**Important:** For production, you'll need to update the `server.url` in `capacitor.config.ts` to point to your deployed Next.js server, or use static export.

## Development Workflow

### Option 1: Development with Live Reload (Recommended)

1. Start your Next.js dev server on your network IP:
   ```bash
   npm run dev:network
   ```
   Note the IP address (e.g., `http://192.168.1.100:3000`)

2. Update `capacitor.config.ts` to point to your dev server:
   ```typescript
   server: {
     url: 'http://192.168.1.100:3000',
     cleartext: true
   }
   ```

3. Sync Capacitor:
   ```bash
   npm run cap:sync
   ```

4. Open in native IDE:
   ```bash
   # iOS
   npm run cap:open:ios
   
   # Android
   npm run cap:open:android
   ```

### Option 2: Build and Test

1. Build your Next.js app:
   ```bash
   npm run build
   ```

2. Sync to native platforms:
   ```bash
   npm run cap:sync
   ```

3. Open in native IDE:
   ```bash
   npm run cap:open:ios  # or cap:open:android
   ```

## Building for Production

### iOS

1. Open Xcode:
   ```bash
   npm run cap:open:ios
   ```

2. In Xcode:
   - Select your development team in "Signing & Capabilities"
   - Choose a device or simulator
   - Click the Play button to run, or Product → Archive to build for App Store

### Android

1. Open Android Studio:
   ```bash
   npm run cap:open:android
   ```

2. In Android Studio:
   - Build → Generate Signed Bundle / APK
   - Follow the wizard to create your release build

## Configuration for Production

### Update Server URL

For production, you have two options:

**Option A: Deploy Next.js and point to it**
```typescript
// capacitor.config.ts
server: {
  url: 'https://your-deployed-app.vercel.app',
  androidScheme: 'https',
  iosScheme: 'https',
}
```

**Option B: Use Static Export (requires converting server actions to API routes)**

1. Update `next.config.js`:
   ```javascript
   output: 'export',
   ```

2. Build:
   ```bash
   npm run build
   ```

3. The `out` folder will contain static files that Capacitor can load.

### App Icons and Splash Screens

1. **iOS Icons:**
   - Open `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Replace the placeholder icons with your app icons
   - Required sizes: 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024

2. **Android Icons:**
   - Open `android/app/src/main/res/`
   - Replace icons in `mipmap-*` folders
   - Use [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) to generate all sizes

3. **Splash Screens:**
   - Configured in `capacitor.config.ts` under `plugins.SplashScreen`
   - You can customize colors and duration there

## Native Features

The following Capacitor plugins are already installed and configured:

- **App**: App lifecycle events
- **StatusBar**: Control status bar appearance
- **SplashScreen**: Customize splash screen
- **Keyboard**: Handle keyboard events
- **Haptics**: Vibration and haptic feedback
- **PushNotifications**: Native push notifications (requires additional setup)

### Push Notifications Setup

1. **iOS:**
   - Enable Push Notifications capability in Xcode
   - Configure APNs certificates in Apple Developer Portal
   - Update Firebase Cloud Messaging configuration

2. **Android:**
   - Configure Firebase Cloud Messaging in `android/app/google-services.json`
   - Update Firebase project settings

## Troubleshooting

### Node Version Issues

If you get "NodeJS >=22.0.0 required":
```bash
# Using nvm
nvm install 22
nvm use 22

# Or download from nodejs.org
```

### iOS Build Issues

- Make sure you have Xcode Command Line Tools: `xcode-select --install`
- Install CocoaPods: `sudo gem install cocoapods`
- Run `pod install` in the `ios/App` directory

### Android Build Issues

- Make sure Android SDK is installed via Android Studio
- Set `ANDROID_HOME` environment variable
- Accept Android SDK licenses: `sdkmanager --licenses`

### Capacitor Sync Issues

If changes aren't appearing:
```bash
npm run cap:sync
```

This copies your web app and syncs native project files.

## Alternative Setup (Without Node 22+)

If you can't upgrade Node.js right now, you can manually set up the platforms:

1. **Create iOS project manually:**
   - Use Xcode to create a new Capacitor iOS project
   - Copy the `capacitor.config.ts` configuration
   - Link the Capacitor dependencies

2. **Create Android project manually:**
   - Use Android Studio to create a new Capacitor Android project
   - Copy the `capacitor.config.ts` configuration
   - Link the Capacitor dependencies

However, using the CLI is much easier, so upgrading Node.js is recommended.

## Next Steps

1. ✅ Install dependencies
2. ✅ Initialize platforms (requires Node 22+)
3. ✅ Configure app icons and splash screens
4. ✅ Set up push notifications (optional)
5. ✅ Test on devices/simulators
6. ✅ Build for App Store / Play Store

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Setup Guide](https://capacitorjs.com/docs/ios)
- [Android Setup Guide](https://capacitorjs.com/docs/android)
- [Next.js + Capacitor Guide](https://capacitorjs.com/docs/guides/nextjs)

