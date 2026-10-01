import { useEffect, useState } from 'react'
import { getEnabled, getFakeOrders, getSavedTotal, setEnabled } from './storage.ts'
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

function App() {
  // null while the saved state is still loading, so the switch never flickers.
  const [enabled, setEnabledState] = useState<boolean | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  // undefined while loading, null for an unsupported site.
  const [storeName, setStoreName] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

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

  if (error) {
    return <p className="error">Couldn't load settings: {error}</p>
  }

  return (
    <>
      <label className="row">
        <span className="label">Guardrail</span>
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
              : `Supported store: ${storeName}. Guardrail is off.`}
        </p>
      )}

      {stats && (
        <div className="stats">
          <p className="kept">You've kept {formatMoney(stats.savedTotal)}</p>
          <p className="count">
            {stats.orderCount} fake {stats.orderCount === 1 ? 'order' : 'orders'}
          </p>
        </div>
      )}
    </>
  )
}

export default App
