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
