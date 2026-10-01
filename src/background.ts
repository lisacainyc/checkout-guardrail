// Background service worker: keeps the toolbar icon and badge in sync with the switch.
import { ENABLED_KEY, getEnabled } from './storage.ts'

// Green shield while on, red while off. The ON/OFF badge text stays too, so
// the state doesn't depend on color alone (red and green look alike to
// many color-blind people).
function iconPaths(enabled: boolean): Record<string, string> {
  const state = enabled ? 'on' : 'off'
  return Object.fromEntries([16, 32, 48, 128].map((size) => [size, `icons/${state}-${size}.png`]))
}

async function updateBadge(enabled: boolean) {
  await chrome.action.setIcon({ path: iconPaths(enabled) })
  await chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' })
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? '#1f9d55' : '#c0392b' })
  await chrome.action.setBadgeTextColor({ color: '#ffffff' })
}

// Chrome clears the badge when the browser restarts, so set it on every wake-up.
getEnabled().then(updateBadge)

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ENABLED_KEY in changes) {
    updateBadge((changes[ENABLED_KEY].newValue as boolean | undefined) ?? true)
  }
})

// Open the welcome page once, when OptOut is first installed (not on updates).
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') })
  }
})
