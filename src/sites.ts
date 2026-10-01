// Supported stores and how to find the important parts of their checkout pages.
// Selectors are CSS selectors, the same syntax as document.querySelector().

export interface SiteConfig {
  // Shown to the user, e.g. "Test Store".
  name: string
  // A store matches a page if EITHER of these matches. Give at least one.
  // Hostnames the store runs on, including the port if any, e.g. "www.target.com".
  hosts?: string[]
  // Patterns for the full URL, checked on any host. For platforms like Shopify,
  // where every store has its own address but the URL paths look the same.
  urlPatterns?: RegExp[]
  // Matches the full URL of checkout pages only.
  checkoutPattern: RegExp
  // Buttons that place the order.
  placeOrderSelectors: string[]
  // Express-pay buttons or the iframes that contain them (PayPal, Apple Pay, etc.).
  expressPaySelectors: string[]
  // Element whose text is the order total, e.g. "$99.98".
  totalSelector: string
  // One element per cart item, plus the name and price inside each one.
  itemSelectors: {
    item: string
    name: string
    price: string
  }
}

export const sites: SiteConfig[] = [
  {
    name: 'Test Store',
    hosts: ['localhost:5174'],
    checkoutPattern: /\/checkout\.html/,
    placeOrderSelectors: ['#place-order'],
    expressPaySelectors: ['#apple-pay', 'iframe.paypal-frame'],
    totalSelector: '#order-total',
    itemSelectors: {
      item: '.item',
      name: '.item-name',
      price: '.item-price',
    },
  },
]

// Returns the supported store for a URL, or undefined if the store isn't supported.
export function findSite(url: URL): SiteConfig | undefined {
  return sites.find(
    (site) =>
      site.hosts?.includes(url.host) ||
      site.urlPatterns?.some((pattern) => pattern.test(url.href)),
  )
}
