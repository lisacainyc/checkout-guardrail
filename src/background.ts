// Background service worker: keeps the toolbar badge in sync with the switch.
import { ENABLED_KEY, getEnabled } from './storage.ts'

async function updateBadge(enabled: boolean) {
  await chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' })
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? '#1f9d55' : '#808080' })
  await chrome.action.setBadgeTextColor({ color: '#ffffff' })
}

// Chrome clears the badge when the browser restarts, so set it on every wake-up.
getEnabled().then(updateBadge)

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && ENABLED_KEY in changes) {
    updateBadge((changes[ENABLED_KEY].newValue as boolean | undefined) ?? true)
  }
})
