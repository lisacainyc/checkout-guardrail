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

- [x] **Chunk 13: Welcome page**

  > On first install, open a welcome page. Explain in plain language what OptOut does, what each permission is for, that it never reads payment info and nothing leaves the browser, how to pin the icon, and how the switch works.

  Done when: removing and reloading the extension opens the welcome page.

## Phase 6: Real stores (Shopify and Amazon only)

You can't safely test selectors on a live checkout first, so use this process for each store:

1. Go to the store's checkout page. Stop before clicking anything. Save both versions if the store has them: logged in (e.g. Shop Pay) and guest (use an Incognito window).
2. Press `Cmd+S` and choose "Webpage, Complete". Put the file in `~/Documents/extension/saved-pages/`.
3. Prompt Claude with the chunk below.
4. Reload the extension and revisit the live checkout. **Click nothing until the "🛡 Protected" label appears on every buy button.** If any buy button lacks the label, stop and report it.

### Shopify (split into four chunks)

Shopify checkouts don't share one address: Gymshark's is `us.checkout.gymshark.com`, others use their own domain, and Shop Pay uses `shop.app`. So Shopify must be recognized by URL path and page content, not by a list of hosts. That changes how every store is matched, so it's split up.

Saved pages: `saved-pages/Checkout - Gymshark US.html` (Shop Pay, `shop.app`) and `saved-pages/Checkout - Gymshark US guest.html` (guest checkout).

- [x] **Chunk 14a: Match stores by URL pattern**

  > Change `sites.ts` so a store can match by host **or** by a URL pattern on any host. Don't add Shopify yet.

  Done when: the test store still works exactly as before (labels, blocking, confirmation, popup status), and 5175 still shows the red banner.

- [x] **Chunk 14b: Run protection on all sites**

  > Make `content.ts` run on all sites, and make the warning script skip any page `content.ts` protects, so a page never shows both the red banner and Protected labels.

  Done when: the test store is still protected, and 5175 still shows the banner.

- [x] **Chunk 14c: Add Shopify**

  > Add a Shopify entry to `sites.ts` using both saved Gymshark pages. Cover Pay now and every express button (Shop Pay, PayPal, Google Pay, Venmo). Serve the saved pages on localhost at a Shopify-like path so we can test safely.

  Done when: both saved pages show Protected labels on Pay now and all express buttons, the fake confirmation shows the right items and total, and there's no red banner.

- [x] **Chunk 14d: Live Shopify check**

  > Walk me through checking a live Shopify checkout (Gymshark) without placing an order.

  Done when: on the live checkout, every buy button has a Protected label. **Click nothing.**

### Amazon (split into six chunks)

Amazon is bigger than one entry for three reasons:
- On product pages, **Buy Now and Add to Cart share one form**. The current rule ("block any submit of a form containing a buy button") would block Add to Cart too, so the core blocking logic has to change for every store.
- Amazon has **two kinds of buy pages**: checkout ("Place your order") and product pages ("Buy Now", "Subscribe"). Each needs its own buttons, item/total selectors, and missing-button rule, so a store must support several page types.
- The test server only serves pages at Shopify-style paths.

Saved pages: `saved-pages/Place Your Order - Amazon Checkout.html` (checkout) and `saved-pages/Amazon.com_ Amazon Brand - Presto! ...html` (product page with Buy Now and Subscribe & Save).

- [x] **Chunk 15a: Block only buy-button submits**

  > Change blocking so a form submit is blocked only when the button that triggered it is a buy button, not every submit of a form that contains one.

  Done when: the test store and Shopify are still fully blocked, and a non-buy submit button in the same form as a buy button (add one to the test store) goes through.

- [x] **Chunk 15b: Page types per store**

  > Let a store have several page types (e.g. checkout and product page), each with its own URL pattern, buy-button and express selectors, item/total selectors, and whether the missing-button warning applies.

  Done when: the test store and Shopify behave exactly as before.

- [x] **Chunk 15c: Serve saved pages at their original paths**

  > Change the saved-page test server to serve each page at the path it was saved from, still cleaned so it can't reach the real store.

  Done when: the Gymshark and Amazon pages load on localhost with no requests to other websites, and the Shopify tests still pass.

- [x] **Chunk 15d: Amazon checkout**

  > Add Amazon's checkout page ("Place your order") using the saved checkout page.

  Done when: on the saved page, every Place your order button is labeled and blocked, and the confirmation shows the right items and total.

- [x] **Chunk 15e: Amazon product page**

  > Add Amazon product pages: block Buy Now and Subscribe & Save, keep Add to Cart working, and show the confirmation with the product name and price. No missing-button warning on product pages.

  Done when: on the saved product page, Buy Now and Subscribe are labeled and blocked, and Add to Cart is not blocked.

- [ ] **Chunk 15f: Live Amazon check**

  > Walk me through checking live Amazon pages without placing an order.

  Done when: live product and checkout pages show labels on every buy button, Add to Cart still works, and pages don't feel slower. **On the checkout page, click nothing: Place your order charges immediately.**

### Other stores

Not planned. OptOut covers only Shopify and Amazon, the stores used most. Other stores get the red "can't protect" banner on their checkouts.

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

- [ ] **Remove test-only addresses before publishing**

  > Remove the test-only entries from `sites.ts` (the Test Store on localhost:5174 and Amazon's localhost:5176). The welcome page's store list updates on its own, since it comes from `sites.ts`.

  Only needed if OptOut is ever shared with other people. They do nothing outside your own computer.

---

## Known limits in v1

- **No network-level blocking.** Blocking the store's order request needs its URL, and finding that URL means placing a real order. The button-level blocking plus the visible Protected label is the v1 safety rule. Add network blocking later.
- **Stores change their pages.** Selectors will break sometimes. The Protected label matters for this reason: a missing label tells you protection failed before you click.
