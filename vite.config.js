import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Tongue Drum Chum',
        short_name: 'DrumChum',
        description: 'Advanced Tongue Drum Notation Player with real-time note detection',
        theme_color: '#667eea',
        background_color: '#667eea',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '48x48',
            type: 'image/x-icon'
          }
        ]
      }
    })
  ],
  build: {
    target: 'es2018',
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000,
    host: true,
    https: false // HTTP on localhost allows microphone access
  },
  preview: {
    port: 4173,
    host: true
  }
})
