import { useEffect, useState } from 'react'
import { getEnabled, getFakeOrders, getSavedTotal, resetSavedTotal, setEnabled } from './storage.ts'
import { findSite } from './sites.ts'

// Name of the supported store open in the current tab, or null if it isn't one.
async function currentStoreName(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  // tab.url is only available thanks to the activeTab permission, which
  // Chrome grants for the current tab when the user clicks the icon.
  if (!tab?.url) return null
  return findSite(new URL(tab.url))?.name ?? null
}

interface Stats {
  savedTotal: number
  orderCount: number
}

async function loadStats(): Promise<Stats> {
  const [savedTotal, orders] = await Promise.all([getSavedTotal(), getFakeOrders()])
  return { savedTotal, orderCount: orders.length }
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function orderCountText(count: number): string {
  return `${count} fake ${count === 1 ? 'order' : 'orders'}`
}

function App() {
  // null while the saved state is still loading, so the switch never flickers.
  const [enabled, setEnabledState] = useState<boolean | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  // undefined while loading, null for an unsupported site.
  const [storeName, setStoreName] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  // True while asking "Reset to $0.00?", before anything is cleared.
  const [confirmingReset, setConfirmingReset] = useState(false)

  useEffect(() => {
    getEnabled()
      .then(setEnabledState)
      .catch((err) => setError(String(err)))

    currentStoreName()
      .then(setStoreName)
      .catch(() => setStoreName(null))

    const refreshStats = () => loadStats().then(setStats).catch((err) => setError(String(err)))
    refreshStats()

    // Keep the numbers current if an order is blocked while the popup is open.
    chrome.storage.onChanged.addListener(refreshStats)
    return () => chrome.storage.onChanged.removeListener(refreshStats)
  }, [])

  async function toggle() {
    if (enabled === null) return
    const next = !enabled
    setEnabledState(next)
    await setEnabled(next)
  }

  async function reset() {
    await resetSavedTotal()
    setConfirmingReset(false)
  }

  if (error) {
    return <p className="error">Couldn't load settings: {error}</p>
  }

  return (
    <>
      <label className="row">
        <span className="label">OptOut</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled ?? false}
          className="switch"
          disabled={enabled === null}
          onClick={toggle}
        >
          <span className="knob" />
        </button>
      </label>

      {storeName !== undefined && (
        <p className={`status ${storeName && enabled ? 'protected' : 'unprotected'}`}>
          {!storeName
            ? 'Not a supported store'
            : enabled
              ? `Protected store: ${storeName}`
              : `Supported store: ${storeName}. OptOut is off.`}
        </p>
      )}

      {stats && !confirmingReset && (
        <div className="stats">
          <p className="kept">You've kept {formatMoney(stats.savedTotal)}</p>
          <p className="count">
            {orderCountText(stats.orderCount)}
            {(stats.savedTotal > 0 || stats.orderCount > 0) && (
              <>
                {' · '}
                <button type="button" className="link" onClick={() => setConfirmingReset(true)}>
                  Reset
                </button>
              </>
            )}
          </p>
        </div>
      )}

      {stats && confirmingReset && (
        <div className="stats">
          <p className="confirm">
            Reset to $0.00? This clears {orderCountText(stats.orderCount)}.
          </p>
          <div className="confirm-buttons">
            <button type="button" className="danger" onClick={reset}>
              Reset
            </button>
            <button type="button" className="secondary" onClick={() => setConfirmingReset(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default App
