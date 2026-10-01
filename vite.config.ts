import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import manifest from './manifest.config.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    rollupOptions: {
      // Pages not listed in the manifest must be added here to be built.
      input: {
        welcome: 'welcome.html',
      },
    },
  },
})
