import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'OptOut',
  version: pkg.version,
  description: 'Shop like normal. Skip the bill.',
  permissions: ['storage', 'activeTab'],
  action: {
    default_popup: 'index.html',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      // Runs on every website. Shopify-style stores can be on any address, so
      // protection can't be limited to a list of hosts. It does nothing on
      // sites that aren't in sites.ts.
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content.ts'],
    },
    {
      // Runs on every website to warn about checkouts OptOut can't protect.
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/warning.ts'],
    },
  ],
})
