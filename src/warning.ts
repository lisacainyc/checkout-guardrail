// Content script for every website NOT in sites.ts. If the page looks like
// a checkout, it shows a red banner so the user knows orders here are real.
import { ENABLED_KEY, getEnabled } from './storage.ts'
import { findSite } from './sites.ts'
import { createBanner } from './banner.ts'

// A URL piece that is exactly "checkout", "cart" or "payment" (or plural),
// optionally with a file extension like ".html".
const CHECKOUT_WORD = /^(checkout|cart|payment)s?(\.[a-z]+)?$/i
const BUY_BUTTON_TEXT = /\b(place (your )?order|pay now|complete (your )?purchase)\b/i
const BUTTON_SELECTOR = 'button, input[type="submit"], input[type="button"], [role="button"]'

let enabled = true
let dismissed = false
let banner: HTMLElement | null = null

// True if a whole piece of the address is a checkout word: a path segment
// ("/checkout", "/cart/", "/checkout.html") or a query key or value
// ("?step=payment"). Words inside longer names don't count, so a GitHub repo
// called "checkout-guardrail" isn't treated as a checkout.
function urlLooksLikeCheckout(url: URL): boolean {
  const pieces = [
    ...url.pathname.split('/'),
    ...[...url.searchParams].flat(),
  ]
  return pieces.some((piece) => CHECKOUT_WORD.test(piece))
}

function looksLikeCheckout(): boolean {
  if (urlLooksLikeCheckout(new URL(location.href))) return true
  for (const button of document.querySelectorAll<HTMLElement>(BUTTON_SELECTOR)) {
    const text = button instanceof HTMLInputElement ? button.value : button.textContent
    // Skip long text: a real buy button has a short label.
    if (text && text.length < 40 && BUY_BUTTON_TEXT.test(text)) return true
  }
  return false
}

function update() {
  const show = enabled && !dismissed && looksLikeCheckout()
  if (show && !banner) {
    banner = createBanner("🛡 OptOut can't protect this checkout. Orders here are real.", () => {
      dismissed = true
      update()
    })
    document.documentElement.append(banner)
  } else if (!show && banner) {
    banner.remove()
    banner = null
  }
}

// Checking every button on every page change could slow busy sites down,
// so check at most once per second.
let pending = false
function scheduleUpdate() {
  if (pending) return
  pending = true
  setTimeout(() => {
    pending = false
    update()
  }, 1000)
}

// Same check as content.ts: if content.ts protects this page, stay out of the way,
// so a page never shows both the red banner and Protected labels.
if (!findSite(new URL(location.href))) {
  getEnabled().then((value) => {
    enabled = value
    update()
  })

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && ENABLED_KEY in changes) {
      enabled = (changes[ENABLED_KEY].newValue as boolean | undefined) ?? true
      update()
    }
  })

  // Catches buy buttons that appear later and URL changes in single-page sites.
  new MutationObserver(scheduleUpdate).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
}
