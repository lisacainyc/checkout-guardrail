import { useEffect, useState } from 'react'
import { getEnabled, setEnabled } from './storage.ts'

function App() {
  // null while the saved state is still loading, so the switch never flickers.
  const [enabled, setEnabledState] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEnabled()
      .then(setEnabledState)
      .catch((err) => setError(String(err)))
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
  )
}

export default App
