import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spicehub.customer',
  appName: 'SpiceHub Customer',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: ['http://localhost:*', 'http://127.0.0.1:*'],
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
