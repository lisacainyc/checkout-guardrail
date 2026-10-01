import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }
import { sites } from './src/sites.ts'

export default defineManifest({
  manifest_version: 3,
  name: 'Checkout Guardrail',
  version: pkg.version,
  description: 'Shop like normal. Skip the bill.',
  permissions: ['storage'],
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
        site.hosts.map((host) => `*://${host.split(':')[0]}/*`),
      ),
      js: ['src/content.ts'],
    },
  ],
})
