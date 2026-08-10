import type { CapacitorConfig } from '@capacitor/cli';

// This is a server-rendered Next.js app with live API routes, not a static
// site, so the wrapper loads the deployed origin directly rather than
// bundling built assets locally — webDir above is only a placeholder
// Capacitor requires to exist, it's never actually served.
const config: CapacitorConfig = {
  appId: 'com.therealbirdscore.app',
  appName: 'BirdScore',
  webDir: 'public',
  server: {
    url: 'https://therealbirdscore.com',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
