// Content script for every website NOT in sites.ts. If the page looks like
// a checkout, it shows a red banner so the user knows orders here are real.
import { ENABLED_KEY, getEnabled } from './storage.ts'
import { findSite } from './sites.ts'

// "checkout", "cart" or "payment" as a separate word in the URL path or query,
// so "/checkout" and "?step=payment" match but "/cartoons" doesn't.
const CHECKOUT_URL = /(^|[/\-_.?=&])(checkout|cart|payment)s?([/\-_.?=&#]|$)/i
const BUY_BUTTON_TEXT = /\b(place (your )?order|pay now|complete (your )?purchase)\b/i
const BUTTON_SELECTOR = 'button, input[type="submit"], input[type="button"], [role="button"]'

let enabled = true
let dismissed = false
let banner: HTMLElement | null = null

function looksLikeCheckout(): boolean {
  if (CHECKOUT_URL.test(location.pathname + location.search)) return true
  for (const button of document.querySelectorAll<HTMLElement>(BUTTON_SELECTOR)) {
    const text = button instanceof HTMLInputElement ? button.value : button.textContent
    // Skip long text: a real buy button has a short label.
    if (text && text.length < 40 && BUY_BUTTON_TEXT.test(text)) return true
  }
  return false
}

function createBanner(): HTMLElement {
  // Shadow DOM so the site's CSS can't hide or restyle the warning.
  const host = document.createElement('div')
  host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;'
  const root = host.attachShadow({ mode: 'closed' })
  root.innerHTML = `
    <style>
      .banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: #c0392b;
        color: white;
        font: 600 15px system-ui, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .text { flex: 1; }
      .close {
        border: none;
        background: transparent;
        color: white;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
      }
      .close:focus-visible { outline: 2px solid white; }
    </style>
    <div class="banner" role="alert">
      <span class="text">🛡 OptOut can't protect this checkout. Orders here are real.</span>
      <button class="close" aria-label="Dismiss warning">×</button>
    </div>
  `
  root.querySelector('.close')!.addEventListener('click', () => {
    dismissed = true
    update()
  })
  return host
}

function update() {
  const show = enabled && !dismissed && looksLikeCheckout()
  if (show && !banner) {
    banner = createBanner()
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
