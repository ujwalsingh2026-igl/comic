import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.omniverse.comic',
  appName: 'Omniverse',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
};

export default config;
