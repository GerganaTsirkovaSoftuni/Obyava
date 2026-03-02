import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  },
  preview: {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  }
});
