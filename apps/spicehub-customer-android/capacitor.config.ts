import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spicehub.customer',
  appName: 'SpiceHub Customer',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'https://spicehub-backend.vercel.app',
      'https://spicehub-customer-table.vercel.app',
      'https://spicehub-guest-portal.vercel.app',
      'https://spicehub-socket-server.onrender.com',
      'https://*.vercel.app',
      'https://*.onrender.com',
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://10.0.2.2:*',
      'http://192.168.1.14:*',
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
