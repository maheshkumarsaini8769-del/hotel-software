import os from 'node:os';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function detectHostLanIp(): string {
  const ifaces = os.networkInterfaces();
  for (const entries of Object.values(ifaces)) {
    for (const addr of entries || []) {
      if (addr && addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return '127.0.0.1';
}

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __SPICEHUB_DEV_LAN_IP__: JSON.stringify(process.env.VITE_LAN_HOST || detectHostLanIp()),
  },
  server: {
    host: '0.0.0.0',
    port: 3012,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
