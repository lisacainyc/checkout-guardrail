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
  {
    // Every Shopify store has its own checkout address (e.g.
    // us.checkout.gymshark.com), so match by URL path instead of host.
    // Built from saved Gymshark pages: the guest checkout and the Shop Pay
    // checkout on shop.app.
    name: 'Shopify store',
    urlPatterns: [
      // Guest checkout: /checkouts/cn/<token> (older stores: /checkouts/c/<token>)
      /\/checkouts\/cn?\/[A-Za-z0-9]+/,
      // Shop Pay checkout on shop.app: /checkout/<shop id>/cn/<token>
      /\/checkout\/\d+\/cn\/[A-Za-z0-9]+/,
    ],
    checkoutPattern: /\/checkouts?\/(\d+\/)?cn?\/[A-Za-z0-9]+/,
    placeOrderSelectors: ['#checkout-pay-button'],
    // Each item in the express list: Shop Pay (a link) and PayPal, Google Pay,
    // Venmo (iframes). Items revealed by "Show more options" are added to the
    // same list, so they're covered too.
    expressPaySelectors: ['#express-checkout-wallets-wrapper > li'],
    // The Total row is the only row in the cost summary whose header is bold.
    // Its cell has two copies of the amount; the last <strong> is the plain one.
    totalSelector:
      '[aria-labelledby^="MoneyLine-Heading"] [role="row"]:has(> [role="rowheader"] > strong) [role="cell"] strong:last-of-type',
    itemSelectors: {
      // Rows of the shopping cart table that have cells (skips the header row).
      item: '[aria-labelledby^="ResourceList"] [role="row"]:has([role="cell"])',
      name: '[role="cell"] p',
      price: '[role="cell"]:last-child span',
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
