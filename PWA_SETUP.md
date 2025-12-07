# PWA Setup

## ✅ Completed

1. **Manifest.json** - Created at `/app/manifest.json`
   - App name, description, theme colors
   - Icons configuration
   - Shortcuts for quick access

2. **Service Worker** - Created at `/public/sw.js`
   - Caching strategy for offline support
   - Cache cleanup on updates

3. **Install Prompt** - Component at `/components/daily-connect/pwa-install-prompt.tsx`
   - Detects installability
   - Shows install prompt to users
   - Handles installation flow

4. **Metadata** - Updated `/app/layout.tsx`
   - PWA metadata
   - Theme colors
   - Apple Web App meta tags

## ⚠️ Required: Icon Files

You need to create and add these icon files to `/public/`:

- `/public/icon-192.png` - 192x192px icon
- `/public/icon-512.png` - 512x512px icon

These icons will be used for:
- App icon when installed
- Home screen icon
- Splash screen
- Install prompt

### Icon Design Tips:
- Use your app logo/branding
- Ensure icons are square
- Make sure important content is centered (icons may be masked)
- Use high contrast for visibility

## Testing

1. Build the app: `npm run build`
2. Start production server: `npm start`
3. Open in Chrome/Edge
4. Look for install prompt or use browser menu → "Install Daily Connect"
5. Test offline functionality

## Next Steps

After adding icons, the PWA will be fully functional!

