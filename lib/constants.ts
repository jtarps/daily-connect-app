// App Store URL — update this once the app is live on the App Store
// To find your URL: App Store Connect → App Information → Apple ID
// Format: https://apps.apple.com/app/famshake/id{APPLE_ID}
export const APP_STORE_URL = 'https://apps.apple.com/app/famshake/id6758928561';

// Google Play Store URL — update when Android is published
export const PLAY_STORE_URL = '';

export function getDownloadUrl(): string | null {
  return APP_STORE_URL || PLAY_STORE_URL || null;
}
