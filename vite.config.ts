import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: {
        // The libraries every page needs, in files that stay cached across
        // deploys of the app code. The rich-text editor and code highlighter
        // are left out on purpose: lazy routes already keep them off every
        // page but their own, and naming them here pulls shared helpers into
        // their chunks, which then load on every page.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/.test(id)) {
            return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
