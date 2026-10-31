import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spicehub.staff',
  appName: 'SpiceHub Staff',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'https://spicehub-backend.vercel.app',
      'https://spicehub-socket-server.onrender.com',
      'https://spicehub-waiter-mobile.vercel.app',
      'https://spicehub-kitchen-kds.vercel.app',
      'https://spicehub-cashier-pos.vercel.app',
      'https://spicehub-reception-frontdesk.vercel.app',
      'https://spicehub-hotel-admin.vercel.app',
      'https://*.vercel.app',
      'https://*.onrender.com',
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://10.208.156.216:*',
      'http://*:*',
      'https://*:*'
    ]
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
