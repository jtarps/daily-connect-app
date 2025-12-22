# Daily Connect

A simple way to let your loved ones know you're okay, every day.

## Features

- ✅ Daily check-ins
- ✅ Circle management (create, invite, join)
- ✅ Friend status tracking
- ✅ Streak tracking
- ✅ Email invitations
- ✅ Password reset
- ✅ Multiple circles support

## Getting Started

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Network Access (for mobile testing)

```bash
npm run dev:network
```

Then access from your phone at `http://YOUR_IP:3000`

## Native Apps (iOS & Android)

Convert your PWA to native iOS and Android apps using Capacitor!

**Quick Start:**
```bash
./scripts/setup-capacitor.sh
```

See [QUICK_START_NATIVE.md](./QUICK_START_NATIVE.md) for 5-minute setup, or [NATIVE_APP_SETUP.md](./NATIVE_APP_SETUP.md) for detailed instructions.

## Deployment

See [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) for deployment instructions.

## Tech Stack

- **Next.js 15** - React framework
- **Firebase** - Authentication, Firestore, Cloud Messaging
- **Capacitor** - Native iOS & Android apps
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components

## Project Structure

```
src/
├── app/                    # Next.js app router pages
├── components/            # React components
│   ├── daily-connect/    # App-specific components
│   └── ui/              # Reusable UI components
├── firebase/             # Firebase configuration and hooks
├── hooks/                # Custom React hooks
└── lib/                  # Utilities and data types
```

## Environment Variables

For local development, create `.env.local`:

```
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

Get this from Firebase Console → Project Settings → Service Accounts

## License

Private project

