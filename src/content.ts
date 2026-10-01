// Content script: runs inside supported store pages.
import { findSite } from './sites.ts'

const site = findSite(new URL(location.href))

if (site && site.checkoutPattern.test(location.href)) {
  console.log(`Guardrail: checkout detected on ${site.name}`)
}
