import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/concepts': path.resolve(__dirname, './src/concepts'),
      '@/synchronizations': path.resolve(__dirname, './src/synchronizations'),
      '@/workers': path.resolve(__dirname, './src/workers'),
      '@/ui': path.resolve(__dirname, './src/ui'),
    },
  },

  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'rdf': ['n3'],
          'document': ['mammoth'],
        }
      }
    },
    minify: 'terser',
    sourcemap: true
  },

  worker: {
    format: 'es'
  },

  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['offline.html'],
      manifest: {
        name: 'Concretize: Document to BFO Knowledge Graph',
        short_name: 'Concretize',
        description: 'Transform Word documents into BFO-compliant RDF knowledge graphs',
        theme_color: '#1a73e8',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['productivity', 'utilities', 'education']
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,json}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/]
      },
      devOptions: {
        enabled: false // Disable in dev for faster HMR
      }
    })
  ],

  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
      ],
    },
  },
});
