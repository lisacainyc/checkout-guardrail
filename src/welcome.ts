// Fills in the list of supported stores on the welcome page from sites.ts.
import { sites } from './sites.ts'

const list = document.getElementById('stores')!
for (const site of sites) {
  const item = document.createElement('li')
  item.textContent = site.name
  list.append(item)
}
