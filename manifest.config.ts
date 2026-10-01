import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'Checkout Guardrail',
  version: pkg.version,
  description: 'Shop like normal. Skip the bill.',
  action: {
    default_popup: 'index.html',
  },
})
