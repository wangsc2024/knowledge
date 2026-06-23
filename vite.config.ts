/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // v3-site-D: Service Worker 預快取 + runtime cache article JSON
    // 二次造訪：所有靜態資源從 SW 取（offline-first）；article 第一次訪問後 cache，下次秒開
    VitePWA({
      registerType: 'autoUpdate',
      // 不寫 manifest（非 installable PWA；只用 SW 加速）
      manifest: false,
      injectRegister: 'auto',
      workbox: {
        // 預快取：所有 dist/ 下的 JS/CSS/HTML + index-lite.json（首屏 critical）
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'data/index-lite.json'],
        // 略過大 article JSON 的 precache（53MB 太多）；改 runtime cache
        globIgnores: ['**/data/articles/**', '**/data/index.json'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // 排除 /presentations/* 被 NavigationRoute 攔截，讓瀏覽器直接取靜態 PDF
        navigateFallbackDenylist: [/^\/presentations\//],
        runtimeCaching: [
          {
            // index.json (full, 850KB) — 背景 fetch，30 天 cache
            urlPattern: /\/data\/index\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kb-index-full-v1',
              expiration: { maxAgeSeconds: 30 * 24 * 3600 },
            },
          },
          {
            // article JSONs — 第一次造訪就 cache，30 天 expiration，最多 500 篇
            urlPattern: /\/data\/articles\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kb-articles-v1',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 3600,
              },
            },
          },
        ],
      },
    }),
    // v3-site-B: gzip + brotli 預壓縮所有 >1KB 的靜態檔（JS / CSS / JSON）
    // Cloudflare Pages / Netlify 會優先 serve .br 給支援的瀏覽器；.gz 為 fallback
    compression({ algorithms: ['gzip'], threshold: 1024, deleteOriginalAssets: false }),
    compression({ algorithms: ['brotliCompress'], threshold: 1024, deleteOriginalAssets: false }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
