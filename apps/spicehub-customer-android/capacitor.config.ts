import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spicehub.customer',
  appName: 'SpiceHub Customer',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    cleartext: true,
    allowNavigation: [
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://10.208.156.216:*',
      'http://*:*',
      'https://*:*'
    ],
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
