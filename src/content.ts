// Content script: runs on every website. On supported stores it blocks real
// orders while OptOut is on. Everywhere else it does nothing.
import { ENABLED_KEY, getEnabled, recordFakeOrder } from './storage.ts'
import { findSite } from './sites.ts'
import { readOrder } from './order.ts'
import { showConfirmation } from './confirmation.ts'
import { createBanner } from './banner.ts'

// warning.ts uses this same check to decide where NOT to show its red banner,
// so a page never gets both the banner and Protected labels.
const site = findSite(new URL(location.href))

// Start blocked until the saved state loads. If anything is uncertain,
// block rather than let a real order through.
let enabled = true

const MARK_ATTR = 'data-optout-protected'
const LABEL_CLASS = 'optout-label'

function isCheckout(): boolean {
  // Checked on every event, because single-page stores change the URL
  // without reloading the page.
  return !!site && site.checkoutPattern.test(location.href)
}

function isActive(): boolean {
  return enabled && isCheckout()
}

// Returns the place-order button the event came from, if any.
function placeOrderButtonFor(target: EventTarget | null): Element | null {
  if (!site || !(target instanceof Element)) return null
  return target.closest(site.placeOrderSelectors.join(','))
}

// True if the form contains a place-order button, so submitting it places an order.
function isOrderForm(form: HTMLFormElement): boolean {
  return !!site && !!form.querySelector(site.placeOrderSelectors.join(','))
}

function block(event: Event, how: string) {
  event.preventDefault()
  event.stopImmediatePropagation()
  console.log(`OptOut: blocked order (${how}) on ${site?.name}`)
  if (!site) return
  const order = readOrder(site)
  if (showConfirmation(order, site.name)) {
    recordFakeOrder({
      store: site.name,
      items: order.items,
      total: order.total,
      date: new Date().toISOString(),
    })
  }
}

function markButtons() {
  if (!site) return
  for (const button of document.querySelectorAll(site.placeOrderSelectors.join(','))) {
    if (button.hasAttribute(MARK_ATTR)) continue
    button.setAttribute(MARK_ATTR, '')

    const label = document.createElement('span')
    label.className = LABEL_CLASS
    label.textContent = '🛡 Protected by OptOut'
    label.style.cssText = `
      all: initial;
      display: block;
      margin: 0 0 4px;
      font: 600 13px system-ui, sans-serif;
      color: #1f9d55;
    `
    button.before(label)
  }
}

function unmarkButtons() {
  for (const label of document.querySelectorAll(`.${LABEL_CLASS}`)) label.remove()
  for (const button of document.querySelectorAll(`[${MARK_ATTR}]`)) {
    button.removeAttribute(MARK_ATTR)
  }
}

// Express-pay buttons (PayPal, Apple Pay, Shop Pay...) often live inside
// iframes from another website, which this script can't reach into. So:
// 1. Make each one `inert`: the browser ignores clicks and keyboard focus
//    on it, including everything inside its iframe.
// 2. Place a cover on top of it. The cover shows the Protected label and
//    catches clicks, so later chunks can show the fake confirmation.

// Covers live in a Shadow DOM, a sealed-off area the store's CSS can't style.
const coverHost = document.createElement('div')
coverHost.style.cssText =
  'all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;'
const coverRoot = coverHost.attachShadow({ mode: 'closed' })
coverRoot.innerHTML = `
  <style>
    .cover {
      position: absolute;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #1f9d55;
      border-radius: 6px;
      background: rgba(240, 250, 244, 0.93);
      font: 600 12px system-ui, sans-serif;
      color: #1f9d55;
      white-space: nowrap;
      overflow: hidden;
      cursor: not-allowed;
      pointer-events: auto;
    }
  </style>
`

// Each covered express-pay element and its cover.
const covers = new Map<Element, HTMLElement>()
let positioning = false

function markExpressPay() {
  if (!site) return
  for (const element of document.querySelectorAll(site.expressPaySelectors.join(','))) {
    if (covers.has(element)) continue
    element.setAttribute('inert', '')

    const cover = document.createElement('div')
    cover.className = 'cover'
    cover.textContent = '🛡 Protected'
    cover.addEventListener('click', (event) => block(event, 'express pay'))
    coverRoot.append(cover)
    covers.set(element, cover)
  }

  if (covers.size > 0 && !coverHost.isConnected) document.documentElement.append(coverHost)
  if (!positioning) {
    positioning = true
    requestAnimationFrame(positionCovers)
  }
}

function unmarkExpressPay() {
  for (const [element, cover] of covers) {
    element.removeAttribute('inert')
    cover.remove()
  }
  covers.clear()
}

// Keep each cover exactly on top of its element, every animation frame,
// so covers follow scrolling, resizing, and layout changes.
function positionCovers() {
  for (const [element, cover] of covers) {
    if (!element.isConnected) {
      cover.remove()
      covers.delete(element)
      continue
    }
    const rect = element.getBoundingClientRect()
    const visible = rect.width > 0 && rect.height > 0
    cover.style.display = visible ? 'flex' : 'none'
    // Extend 2px past each edge so the green border frames the button.
    cover.style.left = `${rect.left - 2}px`
    cover.style.top = `${rect.top - 2}px`
    cover.style.width = `${rect.width + 4}px`
    cover.style.height = `${rect.height + 4}px`
  }

  if (covers.size > 0) requestAnimationFrame(positionCovers)
  else positioning = false
}

// If OptOut is on but can't find the place-order button on a supported
// checkout, the store may have changed its page. Without a warning, the page
// would look protected (no red banner) while orders are real.
const MISSING_BUTTON_DELAY_MS = 3000
const loadedAt = Date.now()
let missingBanner: HTMLElement | null = null
let missingDismissed = false

function updateMissingButtonWarning() {
  const buttonFound = !!site && !!document.querySelector(site.placeOrderSelectors.join(','))
  const waitedLongEnough = Date.now() - loadedAt >= MISSING_BUTTON_DELAY_MS
  const show = isActive() && !buttonFound && waitedLongEnough && !missingDismissed

  if (show && !missingBanner) {
    missingBanner = createBanner(
      "🛡 OptOut couldn't find the buy buttons. Orders here may be real.",
      () => {
        missingDismissed = true
        updateMissingButtonWarning()
      },
    )
    document.documentElement.append(missingBanner)
  } else if (!show && missingBanner) {
    missingBanner.remove()
    missingBanner = null
  }
}

function refreshMarks() {
  if (isActive()) {
    markButtons()
    markExpressPay()
  } else {
    unmarkButtons()
    unmarkExpressPay()
  }
  updateMissingButtonWarning()
}

if (site) {
  // Listen on window in the capture phase, so these run before any of the
  // store's own handlers.
  window.addEventListener(
    'click',
    (event) => {
      if (isActive() && placeOrderButtonFor(event.target)) block(event, 'click')
    },
    true,
  )

  window.addEventListener(
    'submit',
    (event) => {
      if (isActive() && event.target instanceof HTMLFormElement && isOrderForm(event.target)) {
        block(event, 'form submit')
      }
    },
    true,
  )

  window.addEventListener(
    'keydown',
    (event) => {
      if (!isActive() || event.key !== 'Enter') return
      const target = event.target
      // Enter on the button itself counts as pressing it.
      if (placeOrderButtonFor(target)) {
        block(event, 'Enter key')
        return
      }
      // Enter inside a text field of the order form would submit the order too.
      // Stop it silently: people press Enter after typing an address, and a
      // surprise "Order confirmed" screen would be confusing.
      if (target instanceof HTMLInputElement && target.form && isOrderForm(target.form)) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    },
    true,
  )

  // The green outline lives in a stylesheet so it beats the store's own styles.
  const style = document.createElement('style')
  style.textContent = `[${MARK_ATTR}] { outline: 3px solid #1f9d55 !important; outline-offset: 2px !important; }`
  document.documentElement.append(style)

  getEnabled().then((value) => {
    enabled = value
    refreshMarks()
  })

  // Update right away when the switch is flipped in the popup.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && ENABLED_KEY in changes) {
      enabled = (changes[ENABLED_KEY].newValue as boolean | undefined) ?? true
      refreshMarks()
    }
  })

  // Stores often add buttons after the page loads, so keep watching.
  new MutationObserver(refreshMarks).observe(document.documentElement, {
    childList: true,
    subtree: true,
  })

  refreshMarks()
  // Check for missing buttons once the page has had time to build itself,
  // even if nothing on the page changes after that.
  setTimeout(refreshMarks, MISSING_BUTTON_DELAY_MS)
}
