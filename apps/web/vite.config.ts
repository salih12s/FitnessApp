import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      includeAssets: ['pwa-192.svg', 'pwa-512.svg'],
      manifest: {
        name: 'FitnessApp',
        short_name: 'FitnessApp',
        lang: 'tr',
        description: 'Antrenmanlarını kaydet, gelişimini takip et.',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        theme_color: '#0e0f11',
        background_color: '#0e0f11',
        icons: [
          { src: '/pwa-192.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: '/pwa-512.svg', sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3005,
    strictPort: true,
  },
  preview: {
    port: 3005,
    strictPort: true,
  },
});
