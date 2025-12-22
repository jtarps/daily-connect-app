#!/bin/bash

# Capacitor Setup Script
# This script helps set up Capacitor platforms for Daily Connect

set -e

echo "🚀 Setting up Capacitor for Daily Connect..."

# Check Node version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "⚠️  Warning: Capacitor CLI requires Node 22+, but you have Node $NODE_VERSION"
    echo "   You can either:"
    echo "   1. Upgrade Node: nvm install 22 && nvm use 22"
    echo "   2. Continue anyway (may have issues)"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if platforms already exist
if [ -d "ios" ] || [ -d "android" ]; then
    echo "⚠️  iOS or Android platforms already exist."
    read -p "   Remove and reinitialize? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf ios android
    else
        echo "✅ Keeping existing platforms. Run 'npm run cap:sync' to update."
        exit 0
    fi
fi

# Build Next.js app first
echo "📦 Building Next.js app..."
npm run build

# Initialize platforms
echo "📱 Initializing Capacitor platforms..."

# Add iOS (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Adding iOS platform..."
    npx cap add ios || echo "⚠️  Failed to add iOS platform. You may need to install Xcode."
else
    echo "⚠️  Skipping iOS (macOS required)"
fi

# Add Android
echo "🤖 Adding Android platform..."
npx cap add android || echo "⚠️  Failed to add Android platform. You may need to install Android Studio."

# Sync
echo "🔄 Syncing Capacitor..."
npx cap sync

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. iOS:   npm run cap:open:ios"
echo "  2. Android: npm run cap:open:android"
echo ""
echo "For development with live reload:"
echo "  1. Start dev server: npm run dev:network"
echo "  2. Update capacitor.config.ts server.url to your IP"
echo "  3. Run: npm run cap:sync"

