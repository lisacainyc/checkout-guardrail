// Serves the pages saved in saved-pages/ on http://localhost:5176, each at the
// path it was saved from (e.g. /checkouts/cn/... or /gp/product/...), so
// OptOut's URL patterns match and it can be tested without a real store.
//
// Safety: saved pages contain real checkout session tokens. Every page is
// cleaned before serving so it can't contact the real store:
// - all <script> tags are removed (no store code runs)
// - links to other websites are rewritten to the local alarm page
// - images, fonts and preload links pointing to other websites are removed,
//   in pages and in saved stylesheets
// - iframe sandboxes are removed so the local alarm script can work
// - anything OptOut itself added before the page was saved is removed
// A small local script then sends any buy click or form submit that gets
// through to /order-placed.html, which shows REAL ORDER PLACED and the
// button used, like the test store. (Non-buy buttons like Add to Cart land
// there too; check the button name.)
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { join, extname } from 'node:path'

const PORT = 5176
const DIR = new URL('../saved-pages/', import.meta.url).pathname

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

// Runs in served pages and wallet iframes when OptOut lets a click through.
const ALARM_SCRIPT = `<script>
  const alarm = (via) => { window.top.location.href = '/order-placed.html?via=' + via }
  document.addEventListener('submit', (e) => {
    e.preventDefault()
    alarm(e.submitter?.id || e.submitter?.getAttribute('name') || 'form-submit')
  })
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a')
    if (link && link.id === 'shop-pay-button') { e.preventDefault(); alarm('shop-pay') }
  })
  if (window !== window.top) {
    document.addEventListener('click', () => alarm(window.name || 'wallet-iframe'))
  }
</script>
<style>
  html, body { min-height: 100%; }
  /* Amazon's dimming layer over the page. Amazon's scripts hide it; with
     scripts removed it stays on top and swallows every click. */
  #nav-cover { display: none !important; }
</style>`

const ALARM_PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>REAL ORDER PLACED</title></head>
<body style="margin:0;font-family:system-ui;background:#c0392b;color:white;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center">
<div><h1 style="font-size:40px">REAL ORDER PLACED</h1>
<p>Button used: <strong id="via"></strong></p><p>If OptOut was on, it failed to block this order.</p>
<p><a style="color:white" href="javascript:history.back()">Back</a></p></div>
<script>document.getElementById('via').textContent = new URLSearchParams(location.search).get('via') ?? 'unknown'</script>
</body></html>`

// CSS url(...) pointing to another website, including quotes written as
// &quot; or &#39; inside HTML style attributes.
const REMOTE_CSS_URL = /url\((?:['"]|&quot;|&#39;)?https?:\/\/[^)]*\)/gi

// If a page was saved while OptOut was running, Chrome saves OptOut's own
// additions too (banners, labels, outlines). Remove them, so every test starts
// from the store's page as the store sent it.
function removeOptOutLeftovers(html) {
  return html
    .replace(
      /<div\b[^>]*>\s*<template shadowrootmode="[^"]*">[\s\S]*?<\/template>\s*<\/div>/gi,
      (block) => (block.includes('OptOut') ? '' : block),
    )
    .replace(/<span class="optout-label"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<style>\[data-optout-(protected|outline)\][^<]*<\/style>/gi, '')
    .replace(/\sdata-optout-(protected|outline)=""/gi, '')
}

function clean(html) {
  return removeOptOutLeftovers(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*rel="(modulepreload|preload|prefetch|dns-prefetch|preconnect)"[^>]*>/gi, '')
    .replace(/<meta\b[^>]*http-equiv="(refresh|origin-trial)"[^>]*>/gi, '')
    .replace(/\ssandbox="[^"]*"/gi, '')
    .replace(/<a\b([^>]*?)href="https?:\/\/[^"]*"/gi, '<a$1href="/order-placed.html?via=link"')
    .replace(/\s(src|href|action)="https?:\/\/[^"]*"/gi, ' $1="#removed"')
    .replace(/\ssrcset="[^"]*https?:\/\/[^"]*"/gi, '')
    .replace(REMOTE_CSS_URL, 'url(#removed)')
    .replace(/<\/body>/i, `${ALARM_SCRIPT}</body>`)
}

// Serves each saved page at the path it was saved from. Chrome records the
// original address in a "saved from url" comment at the top of the file.
async function routes() {
  const map = new Map()
  for (const file of await readdir(DIR)) {
    if (extname(file) !== '.html') continue
    const html = await readFile(join(DIR, file), 'utf8')
    const savedFrom = html.match(/saved from url=\(\d+\)(\S+)/)?.[1]
    const slug = file.replace(/\.html$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    let path = savedFrom ? new URL(savedFrom).pathname : `/saved/${slug}`
    // Two pages saved from the same path: keep both reachable.
    if (map.has(path)) path = `${path}${path.endsWith('/') ? '' : '/'}${slug}`
    map.set(path, file)
  }
  return map
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = decodeURIComponent(url.pathname)
  const pages = await routes()

  try {
    if (path === '/') {
      const links = [...pages].map(([p, f]) => `<li><a href="${p}">${f}</a></li>`).join('')
      res.writeHead(200, { 'content-type': TYPES['.html'] })
      return res.end(`<!doctype html><meta charset="utf-8"><title>Saved pages</title><h1>Saved checkout pages</h1><ul>${links}</ul>`)
    }
    if (path === '/order-placed.html') {
      res.writeHead(200, { 'content-type': TYPES['.html'] })
      return res.end(ALARM_PAGE)
    }
    if (pages.has(path)) {
      const html = await readFile(join(DIR, pages.get(path)), 'utf8')
      res.writeHead(200, { 'content-type': TYPES['.html'] })
      return res.end(clean(html))
    }
    // Assets: anything inside a "<page>_files/" folder, wherever the browser asks for it.
    const asset = path.match(/\/([^/]+_files\/.+)$/)?.[1]
    if (asset && !asset.includes('..')) {
      const type = TYPES[extname(asset)] ?? 'application/octet-stream'
      if (type === 'text/javascript') {
        res.writeHead(404)
        return res.end()
      }
      let body = await readFile(join(DIR, asset))
      if (extname(asset) === '.html') body = clean(body.toString('utf8'))
      // Saved stylesheets can load fonts and images from other websites too.
      if (extname(asset) === '.css') {
        body = body.toString('utf8').replace(REMOTE_CSS_URL, 'url(#removed)')
      }
      res.writeHead(200, { 'content-type': type })
      return res.end(body)
    }
    res.writeHead(404)
    res.end('Not found')
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, async () => {
  console.log(`Saved checkout pages: http://localhost:${PORT}/`)
  for (const path of (await routes()).keys()) console.log(`  http://localhost:${PORT}${path}`)
})
