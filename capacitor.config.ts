import type { CapacitorConfig } from '@capacitor/cli';

// This is a server-rendered Next.js app with live API routes, not a static
// site, so the wrapper loads the deployed origin directly rather than
// bundling built assets locally — webDir above is only a placeholder
// Capacitor requires to exist, it's never actually served.
const config: CapacitorConfig = {
  appId: 'com.therealbirdscore.app',
  appName: 'BirdScore',
  webDir: 'public',
  // Must be the canonical host Vercel actually serves (www), not the bare
  // domain — the bare domain 308-redirects to www, and Capacitor's WKWebView
  // navigation delegate treats a redirect to a different host as leaving
  // the app, cancelling the in-app load (WebKitErrorDomain 102) and handing
  // it to the system browser instead of following it like a normal browser
  // tab would.
  server: {
    url: 'https://www.therealbirdscore.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
