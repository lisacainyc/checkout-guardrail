import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }
import { sites } from './src/sites.ts'

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
      // Run on every page of every supported store. Chrome match patterns
      // can't include ports, so drop the port here; findSite() still checks it.
      matches: sites.flatMap((site) =>
        (site.hosts ?? []).map((host) => `*://${host.split(':')[0]}/*`),
      ),
      js: ['src/content.ts'],
    },
    {
      // Run on every website to warn about checkouts OptOut can't protect.
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/warning.ts'],
    },
  ],
})
