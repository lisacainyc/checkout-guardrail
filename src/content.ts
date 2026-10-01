// Content script: runs inside supported store pages and blocks real orders
// while Guardrail is on.
import { ENABLED_KEY, getEnabled } from './storage.ts'
import { findSite } from './sites.ts'

const site = findSite(new URL(location.href))

// Start blocked until the saved state loads. If anything is uncertain,
// block rather than let a real order through.
let enabled = true

const MARK_ATTR = 'data-guardrail-protected'
const LABEL_CLASS = 'guardrail-label'

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
  console.log(`Guardrail: blocked order (${how}) on ${site?.name}`)
}

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
    // Enter on the button itself, or Enter inside a text field of the order form.
    const onButton = placeOrderButtonFor(target)
    const inOrderForm =
      target instanceof HTMLInputElement && !!target.form && isOrderForm(target.form)
    if (onButton || inOrderForm) block(event, 'Enter key')
  },
  true,
)

function markButtons() {
  if (!site) return
  for (const button of document.querySelectorAll(site.placeOrderSelectors.join(','))) {
    if (button.hasAttribute(MARK_ATTR)) continue
    button.setAttribute(MARK_ATTR, '')

    const label = document.createElement('span')
    label.className = LABEL_CLASS
    label.textContent = '🛡 Protected by Guardrail'
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

function refreshMarks() {
  if (isActive()) markButtons()
  else unmarkButtons()
}

if (site) {
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
}
