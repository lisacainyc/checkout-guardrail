// The fake "Order confirmed" screen shown when OptOut blocks an order.
import type { Order } from './order.ts'

let open = false

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// Looks like a real order number, e.g. "GR-482-1937".
function fakeOrderNumber(): string {
  const digits = (count: number) =>
    Array.from({ length: count }, () => Math.floor(Math.random() * 10)).join('')
  return `GR-${digits(3)}-${digits(4)}`
}

// Builds an element with text content. Using textContent (never innerHTML)
// for page text means a store's item names can't inject HTML into our screen.
function el(tag: string, className: string, text = ''): HTMLElement {
  const element = document.createElement(tag)
  element.className = className
  element.textContent = text
  return element
}

// Returns false if the screen was already open, so the caller doesn't
// count the same order twice.
export function showConfirmation(order: Order, storeName: string): boolean {
  if (open) return false
  open = true

  const kept = order.total !== null ? formatMoney(order.total) : order.totalText || 'your money'

  // Shadow DOM: the store's CSS can't change how this screen looks.
  const host = document.createElement('div')
  host.style.cssText = 'all: initial; position: fixed; inset: 0; z-index: 2147483647;'
  const root = host.attachShadow({ mode: 'closed' })

  root.innerHTML = `
    <style>
      .backdrop {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: #f3faf6;
        font-family: system-ui, sans-serif;
        color: #1d2a22;
        overflow-y: auto;
      }
      .card {
        width: 100%;
        max-width: 420px;
        padding: 32px 28px;
        border-radius: 16px;
        background: white;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        text-align: center;
        animation: pop 0.35s ease-out;
      }
      .check {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 64px;
        height: 64px;
        margin: 0 auto 16px;
        border-radius: 50%;
        background: #1f9d55;
        color: white;
        font-size: 34px;
      }
      h1 { margin: 0 0 4px; font-size: 26px; }
      .order-number { margin: 0 0 24px; color: #5d6b63; font-size: 14px; }
      .items { margin: 0 0 12px; padding: 0; list-style: none; text-align: left; }
      .item {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #eef2ef;
        font-size: 15px;
      }
      .total {
        display: flex;
        justify-content: space-between;
        margin: 0 0 24px;
        font-weight: 700;
        font-size: 16px;
      }
      .kept {
        margin: 0 0 4px;
        font-size: 22px;
        font-weight: 700;
        color: #1f9d55;
      }
      .note { margin: 0 0 24px; color: #5d6b63; font-size: 13px; }
      .back {
        width: 100%;
        padding: 12px;
        border: none;
        border-radius: 8px;
        background: #1f9d55;
        color: white;
        font: 600 16px system-ui, sans-serif;
        cursor: pointer;
      }
      .back:focus-visible { outline: 3px solid #0b5e31; outline-offset: 2px; }
      @keyframes pop {
        from { transform: scale(0.92); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @media (prefers-reduced-motion: reduce) {
        .card { animation: none; }
      }
    </style>
  `

  const backdrop = el('div', 'backdrop')
  const card = el('div', 'card')
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-modal', 'true')
  card.setAttribute('aria-labelledby', 'title')

  const check = el('div', 'check', '✓')
  check.setAttribute('aria-hidden', 'true')
  const title = el('h1', '', 'Order confirmed')
  title.id = 'title'
  card.append(check, title, el('p', 'order-number', `Order #${fakeOrderNumber()} · ${storeName}`))

  const list = el('ul', 'items')
  for (const item of order.items) {
    const row = el('li', 'item')
    row.append(el('span', '', item.name), el('span', '', item.price))
    list.append(row)
  }
  card.append(list)

  if (order.totalText) {
    const total = el('div', 'total')
    total.append(el('span', '', 'Total'), el('span', '', order.totalText))
    card.append(total)
  }

  card.append(
    el('p', 'kept', `You kept ${kept}.`),
    el('p', 'note', 'OptOut stopped this order. Nothing was sent to the store and nothing was charged.'),
  )

  const back = el('button', 'back', 'Back to store')
  card.append(back)
  backdrop.append(card)
  root.append(backdrop)

  // Stop the store page from scrolling behind the screen.
  const previousOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'

  function close() {
    host.remove()
    document.documentElement.style.overflow = previousOverflow
    document.removeEventListener('keydown', onKeydown, true)
    open = false
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') close()
  }

  back.addEventListener('click', close)
  document.addEventListener('keydown', onKeydown, true)
  document.documentElement.append(host)
  back.focus()
  return true
}
