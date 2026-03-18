/**
 * Detect if running inside a native Capacitor app.
 * Checks both the Capacitor npm package AND the window bridge
 * to handle cases where the bridge loads after the JS bundle.
 */
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;

  // Check the native bridge directly (injected by Capacitor shell)
  const win = window as any;
  if (win.Capacitor?.isNativePlatform?.()) return true;
  if (win.Capacitor?.getPlatform?.() === 'ios') return true;
  if (win.Capacitor?.getPlatform?.() === 'android') return true;

  // Check user agent for Capacitor WebView indicators
  const ua = navigator.userAgent || '';
  if (ua.includes('FamShake') || ua.includes('Capacitor')) return true;

  // Check if loaded inside a WKWebView (iOS native) vs Safari
  // WKWebView doesn't have the Safari identifier in standalone mode
  const isIosWebView = /iPhone|iPad|iPod/.test(ua) && !ua.includes('Safari');
  if (isIosWebView) return true;

  return false;
}
