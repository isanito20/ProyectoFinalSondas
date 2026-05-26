import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

import Vue from '@vitejs/plugin-vue'
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import Fonts from 'unplugin-fonts/vite'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [
    // 🔐 HTTPS + COOP/COEP para SharedArrayBuffer (OBLIGATORIO para splat)
    mkcert(),

    Vue({
      template: {
        transformAssetUrls,
      },
    }),

    Vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/styles/settings.scss',
      },
    }),

    Fonts({
      fontsource: {
        families: [
          {
            name: 'Roboto',
            weights: [100, 300, 400, 500, 700, 900],
            styles: ['normal', 'italic'],
          },
        ],
      },
    }),
  ],

  define: {
    'process.env': {},
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    extensions: ['.js', '.ts', '.vue', '.json'],
  },

  server: {
    https: true, // 🔥 necesario para crossOriginIsolated
    port: 3000,

    // 🔥 respaldo por si mkcert no aplica todo
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})