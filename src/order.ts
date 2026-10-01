// Reads the order (items and total) from a checkout page.
// Only reads the visible text of the elements named in sites.ts.
// Never reads form fields, so payment details are never touched.
import type { SiteConfig } from './sites.ts'

export interface OrderItem {
  name: string
  price: string
}

export interface Order {
  items: OrderItem[]
  // The total as shown on the page, e.g. "$99.98".
  totalText: string
  // The total as a number, e.g. 99.98, or null if it couldn't be read.
  total: number | null
}

// True for form fields (and anything containing them), which we must never read.
function isFormField(element: Element): boolean {
  return !!element.closest('input, textarea, select') || !!element.querySelector('input, textarea, select')
}

function readText(element: Element | null): string {
  if (!element || isFormField(element)) return ''
  return element.textContent?.trim() ?? ''
}

// Turns "$1,299.99" into 1299.99. Returns null if there's no number.
export function parsePrice(text: string): number | null {
  const match = text.replace(/,/g, '').match(/\d+(\.\d+)?/)
  return match ? Number(match[0]) : null
}

export function readOrder(site: SiteConfig): Order {
  const { item, name, price } = site.itemSelectors
  const items = [...document.querySelectorAll(item)]
    .map((element) => ({
      name: readText(element.querySelector(name)),
      price: readText(element.querySelector(price)),
    }))
    .filter((orderItem) => orderItem.name)

  const totalText = readText(document.querySelector(site.totalSelector))
  return { items, totalText, total: parsePrice(totalText) }
}
