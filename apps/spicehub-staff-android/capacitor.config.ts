import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spicehub.staff',
  appName: 'SpiceHub Staff',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'http://localhost:*',
      'http://127.0.0.1:*',
      'http://10.208.156.216:*',
      'http://10.163.112.94:*',
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
