// Supported stores and how to find the important parts of their buy pages.
// Selectors are CSS selectors, the same syntax as document.querySelector().

// One kind of page on a store where you can buy something, e.g. the checkout
// page or a product page with a "Buy Now" button.
export interface PageType {
  // Short description, used in logs, e.g. "checkout".
  name: string
  // Matches the full URL of this kind of page.
  pattern: RegExp
  // Buttons that place the order.
  placeOrderSelectors: string[]
  // Express-pay buttons or the iframes that contain them (PayPal, Apple Pay, etc.).
  expressPaySelectors: string[]
  // Element whose text is the order total, e.g. "$99.98".
  totalSelector: string
  // One element per item, plus the name and price inside each one.
  itemSelectors: {
    item: string
    name: string
    price: string
  }
  // Show "OptOut couldn't find the buy buttons" if no place-order button is
  // found. True for checkouts, which always have one. False for pages that
  // often have no buy button, like product pages for out-of-stock items.
  warnIfNoBuyButton: boolean
}

export interface SiteConfig {
  // Shown to the user, e.g. "Test Store".
  name: string
  // A store matches a page if EITHER of these matches. Give at least one.
  // Hostnames the store runs on, including the port if any, e.g. "www.target.com".
  hosts?: string[]
  // Patterns for the full URL, checked on any host. For platforms like Shopify,
  // where every store has its own address but the URL paths look the same.
  urlPatterns?: RegExp[]
  // The kinds of buy pages on this store. The first one whose pattern matches wins.
  pages: PageType[]
}

export const sites: SiteConfig[] = [
  {
    name: 'Test Store',
    hosts: ['localhost:5174'],
    pages: [
      {
        name: 'checkout',
        pattern: /\/checkout\.html/,
        placeOrderSelectors: ['#place-order'],
        expressPaySelectors: ['#apple-pay', 'iframe.paypal-frame'],
        totalSelector: '#order-total',
        itemSelectors: {
          item: '.item',
          name: '.item-name',
          price: '.item-price',
        },
        warnIfNoBuyButton: true,
      },
    ],
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
    pages: [
      {
        name: 'checkout',
        pattern: /\/checkouts?\/(\d+\/)?cn?\/[A-Za-z0-9]+/,
        placeOrderSelectors: ['#checkout-pay-button'],
        // Each item in the express list: Shop Pay (a link) and PayPal, Google Pay,
        // Venmo (iframes). Any express buttons Shopify adds to this list later are
        // covered too.
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
        warnIfNoBuyButton: true,
      },
    ],
  },
  {
    // Listed after Shopify: the saved-page test server (localhost:5176) also
    // serves Shopify pages, which must match Shopify first.
    name: 'Amazon',
    hosts: [
      'www.amazon.com',
      // TEST ONLY: saved Amazon pages served by npm run store:shopify.
      'localhost:5176',
    ],
    pages: [
      {
        // The final page, with "Place your order". Built from a saved page at
        // /checkout/p/p-<purchase id>/spc.
        name: 'checkout',
        pattern: /\/checkout\/p\/p-[\d-]+\/spc/,
        // The page has several copies of the button (top, bottom, and disabled
        // versions shown while the page updates). Match them all.
        placeOrderSelectors: ['input[name="placeYourOrder1"]'],
        expressPaySelectors: [],
        // Every row of the cost summary has this amount marker. Subtotal rows
        // also have a hidden "subtotalLineType" field; the Order total row
        // doesn't, so it's the first amount in a row without one.
        totalSelector:
          '#subtotals-marketplace-table li:not(:has(input[name="subtotalLineType"])) [data-shimmer-target="ordertotals-amount"]',
        itemSelectors: {
          item: '.lineitem-container',
          name: '.lineitem-title-text',
          price: '.a-price .a-offscreen',
        },
        warnIfNoBuyButton: true,
      },
      {
        // Product pages: /dp/<ASIN> or /gp/product/<ASIN>, where an ASIN is
        // Amazon's 10-character product ID. Built from a saved page.
        name: 'product',
        pattern: /\/(dp|gp\/product)\/[A-Z0-9]{10}/,
        placeOrderSelectors: [
          // Buy Now skips the cart and orders right away.
          '#buy-now-button',
          // Subscribe & Save places a first order right away, then repeats it.
          '#rcx-subscribe-submit-button-announce',
        ],
        // Add to Cart shares a form with Buy Now and is deliberately NOT here.
        expressPaySelectors: [],
        // The one-time purchase price. For Subscribe, Amazon's discounted
        // price may be lower, so "You kept" can be slightly high.
        totalSelector: '#corePrice_feature_div .a-price .a-offscreen',
        itemSelectors: {
          item: '#dp',
          name: '#productTitle',
          price: '#corePrice_feature_div .a-price .a-offscreen',
        },
        // Many product pages have no Buy Now (out of stock, sold by others).
        warnIfNoBuyButton: false,
      },
    ],
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

// Returns the kind of buy page a URL is on, or undefined if it isn't a buy page.
export function findPage(site: SiteConfig, url: URL): PageType | undefined {
  return site.pages.find((page) => page.pattern.test(url.href))
}
