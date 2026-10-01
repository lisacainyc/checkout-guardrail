// A red warning banner fixed to the top of the page, with a × to dismiss it.
// Used for "OptOut can't protect this checkout" and "couldn't find the buy buttons".

export function createBanner(text: string, onDismiss: () => void): HTMLElement {
  // Shadow DOM so the site's CSS can't hide or restyle the warning.
  const host = document.createElement('div')
  host.style.cssText = 'all: initial; position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;'
  const root = host.attachShadow({ mode: 'closed' })
  root.innerHTML = `
    <style>
      .banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: #c0392b;
        color: white;
        font: 600 15px system-ui, sans-serif;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .text { flex: 1; }
      .close {
        border: none;
        background: transparent;
        color: white;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
      }
      .close:focus-visible { outline: 2px solid white; }
    </style>
    <div class="banner" role="alert">
      <span class="text"></span>
      <button class="close" aria-label="Dismiss warning">×</button>
    </div>
  `
  root.querySelector('.text')!.textContent = text
  root.querySelector('.close')!.addEventListener('click', onDismiss)
  return host
}
