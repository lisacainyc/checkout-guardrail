import { useEffect, useState } from 'react'
import { getEnabled, getFakeOrders, getSavedTotal, setEnabled } from './storage.ts'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEnabled()
      .then(setEnabledState)
      .catch((err) => setError(String(err)))

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
