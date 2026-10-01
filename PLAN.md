# OptOut: Build Plan (20-minute version)

Goal: build only what a brand-new user encounters in their first 20 minutes.

## Rules for each chunk

- Send one chunk per prompt. Test it before sending the next one.
- Each chunk ends with a "Done when" test. If the test fails, describe what you saw before moving on.
- After each chunk passes, ask Claude to commit it to Git.
- **Never test on a real store with a real card until Phase 6.** Phases 2–5 use a fake store that runs on your own computer.

---

## Phase 0: Safety net

- [x] **Chunk 0: Git**

  > Set up Git in `~/Documents/extension` and make a first commit. After each later chunk, I'll ask you to commit.

  Done when: `git log` shows one commit. You can then undo any bad chunk.

## Phase 1: Toggle

- [x] **Chunk 1: Popup toggle**

  > Replace Hello world with an on/off switch labeled "OptOut". Save its state in `chrome.storage.local` so it survives closing the popup. Default: on.

  Done when: you switch it off, close the popup, reopen it, and it is still off.

- [x] **Chunk 2: Toolbar badge**

  > Add a background service worker. It shows a green "ON" badge on the toolbar icon when the guardrail is on and a gray "OFF" badge when it's off. The badge updates instantly when I flip the switch.

  Done when: the badge changes as you toggle.

## Phase 2: Fake test store

- [x] **Chunk 3: Test store**

  > Create a `test-store/` folder with a plain HTML fake shop: one checkout page with 2 items, a total, a "Place order" button, plus fake "Buy with PayPal" and "Apple Pay" buttons. Clicking any button with the extension off shows "REAL ORDER PLACED". Add an `npm run store` script that serves it on localhost.

  Done when: `npm run store` opens the shop, and clicking "Place order" shows "REAL ORDER PLACED". That message is your alarm: if you see it while the guardrail is on, something is broken.

## Phase 3: Core interception

- [x] **Chunk 4: Store config and detection**

  > Create `src/sites.ts`: a list of supported stores. Each entry has a name, matching URL, checkout page pattern, place-order button selectors, express-pay selectors, total selector, and item selectors. Add only the test store for now. Add a content script that logs "OptOut: checkout detected on <store>" on matching checkout pages.

  Done when: the DevTools console on the test store checkout shows the log.

- [x] **Chunk 5: Block Place order**

  > When the guardrail is on, the content script blocks the place-order button. It catches the click, form submit, and the Enter key. Add a visible green outline plus a "🛡 Protected" label on the blocked button, so I can see protection before I click.

  Done when: guardrail on, the button has the label, and clicking it never shows "REAL ORDER PLACED". OptOut off, the real order message appears.

- [x] **Chunk 6: Block express pay**

  > Also block express-pay buttons (PayPal, Apple Pay, Shop Pay, etc.) using a clickable cover placed over them, since many live in iframes we can't reach into. Same Protected label.

  Done when: neither fake express button places a "real" order while the guardrail is on.

- [x] **Chunk 7: Fake confirmation**

  > When a blocked button is clicked, show a full-page "Order confirmed" screen: fake order number, items, total read from the page, and "You kept $X." Use Shadow DOM so store styles don't break it. Include a "Back to store" button. Never read payment fields.

  Done when: clicking "Place order" shows the confirmation with the correct items and total.

- [x] **Chunk 8: Save fake orders**

  > On each fake order, save `{ store, items, total, date }` to `chrome.storage.local` and add the total to a running saved total.

  Done when: two fake orders produce a saved total equal to both totals combined (check it in the extension's DevTools storage).

- [x] **Chunk 9: Popup saved total**

  > Show "You've kept $X" and the fake-order count in the popup, under the switch.

  Done when: the popup numbers match what you did in Chunk 8.

## Phase 4: Coverage transparency

- [x] **Chunk 10: Current-site status**

  > In the popup, show the current tab's status: "Protected store" (in `sites.ts`) or "Not a supported store".

  Done when: the test store shows Protected, and any other site shows Not supported.

- [x] **Chunk 11: Unprotected checkout warning**

  > On any site not in `sites.ts`, detect checkout-like pages (URL contains checkout/cart/payment, or a button says "Place order", "Pay now", or "Complete purchase"). Show a red banner: "OptOut can't protect this checkout. Orders here are real."

  Done when: a copy of the test store under a different path or port, not in the config, shows the red banner.

  Note: this chunk needs access to every site. Chrome will show users a "read all sites" permission warning, and Chunk 13 explains why.

## Phase 5: Onboarding

- [ ] **Chunk 13: Welcome page**

  > On first install, open a welcome page. Explain in plain language what OptOut does, what each permission is for, that it never reads payment info and nothing leaves the browser, how to pin the icon, and how the switch works.

  Done when: removing and reloading the extension opens the welcome page.

## Phase 6: Real stores (one chunk per store)

You can't safely test selectors on a live checkout first, so use this process for each store:

1. Go to the store's checkout page while logged in. Stop before clicking anything.
2. Press `Cmd+S` and choose "Webpage, Complete". Put the file in `~/Documents/extension/saved-pages/`.
3. Prompt Claude with the chunk below.
4. Reload the extension and revisit the live checkout. **Click nothing until the "🛡 Protected" label appears on every buy button.** If any buy button lacks the label, stop and report it.

- [ ] **Chunk 14: Shopify stores**
- [ ] **Chunk 15: Amazon**
- [ ] **Chunk 16: Target**
- [ ] **Chunk 17: Walmart**

  > Add [Shopify stores / Amazon / Target / Walmart] to `sites.ts` using the saved page in `saved-pages/<file>`. Include Buy Now / 1-Click / express pay buttons.

  Do Shopify first: one config entry covers thousands of stores.

  Amazon is the hardest. Buy Now and 1-Click appear on product pages, not just checkout, so it may take two chunks.

## Phase 7: Wrap-up

- [ ] **Chunk 18: End-to-end check**

  > Walk me through a full new-user test: install, welcome page, toggle, test store order, saved total, unsupported-site warning, switching off. List anything broken.

The default cart behavior from the 20-minute list ("keep the cart") needs no work: the order never submits, so the cart stays.

---

## Later (not in the 20-minute version)

- [ ] **Chunk 12: Off reminder**

  > When I switch the guardrail off, start a 15-minute timer with `chrome.alarms`. When the timer ends, show a notification: "OptOut is still off. Turn it back on?" Clicking the notification turns the guardrail on.

  Done when: setting the timer to 1 minute for testing makes the notification appear. Then set it back to 15.

  Skipped for now. Until it exists, the gray OFF badge and the popup's "OptOut is off" status are the only reminders.

---

## Known limits in v1

- **No network-level blocking.** Blocking the store's order request needs its URL, and finding that URL means placing a real order. The button-level blocking plus the visible Protected label is the v1 safety rule. Add network blocking later.
- **Stores change their pages.** Selectors will break sometimes. The Protected label matters for this reason: a missing label tells you protection failed before you click.
