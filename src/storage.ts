// Shared helpers for reading and writing extension state in chrome.storage.local.

export const ENABLED_KEY = 'enabled'

export async function getEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get<{ [ENABLED_KEY]?: boolean }>(ENABLED_KEY)
  // Default to on when nothing has been saved yet.
  return result[ENABLED_KEY] ?? true
}

export async function setEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_KEY]: enabled })
}

const FAKE_ORDERS_KEY = 'fakeOrders'
const SAVED_TOTAL_KEY = 'savedTotal'

export interface FakeOrder {
  store: string
  items: { name: string; price: string }[]
  // Order total in dollars, or null if it couldn't be read from the page.
  total: number | null
  // When the order was blocked, as an ISO date string, e.g. "2026-10-01T02:45:00.000Z".
  date: string
}

export async function getFakeOrders(): Promise<FakeOrder[]> {
  const result = await chrome.storage.local.get<{ [FAKE_ORDERS_KEY]?: FakeOrder[] }>(FAKE_ORDERS_KEY)
  return result[FAKE_ORDERS_KEY] ?? []
}

export async function getSavedTotal(): Promise<number> {
  const result = await chrome.storage.local.get<{ [SAVED_TOTAL_KEY]?: number }>(SAVED_TOTAL_KEY)
  return result[SAVED_TOTAL_KEY] ?? 0
}

// Adds a fake order to the history and its total to the running saved total.
export async function recordFakeOrder(order: FakeOrder): Promise<void> {
  const [orders, savedTotal] = await Promise.all([getFakeOrders(), getSavedTotal()])
  // Round to cents so repeated adding doesn't drift (0.1 + 0.2 = 0.30000000000000004).
  const newTotal = Math.round((savedTotal + (order.total ?? 0)) * 100) / 100
  await chrome.storage.local.set({
    [FAKE_ORDERS_KEY]: [...orders, order],
    [SAVED_TOTAL_KEY]: newTotal,
  })
}
