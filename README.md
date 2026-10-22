# Tokri V2

A flat, minimal grocery price comparison app for six Indian quick-commerce stores.
**Vite + React + TypeScript, vanilla CSS Modules, Supabase, React Router.**

The old static app lives one folder up. This folder is the V2 rewrite from the module plan:
catalog in Postgres, a single cart engine for personal and community carts, stored price
history and watches, saved addresses, per-store order tracking, and a full legal page.

> **Honesty rule.** Every shelf price, price snapshot, delivery ETA and rider position in
> Tokri is **simulated** demo data. No store API is called and no order or payment leaves the
> app. The UI labels this in the header, cart, product page, tracker, footer and `/legal`.

---

## Quick start

```bash
cd tokri
npm install
cp .env.example .env.local        # then fill in the public Supabase URL + anon key
npm run dev
```

`npm run build` typechecks and emits `dist/`. Any static host works; `vercel.json` contains
the SPA rewrite. For GitHub Pages, switch to `HashRouter` and set `base` in `vite.config.ts`.

Node 20+ is recommended. The app falls back to `src/data/catalog.fallback.json` when the
Supabase catalog is unreachable and keeps the cart on the device, with a visible “Offline
catalog” notice. It never pretends bundled data is live.

## Environment

| Variable | Where | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local`, `.env.production` | Public project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`, `.env.production` | Public anon/publishable key only |
| `SUPABASE_URL` | shell only | Used by scripts; never bundled |
| `SUPABASE_SERVICE_ROLE_KEY` | shell only | Used only by `scripts/fetch-images.mjs`; never commit |
| `OFF_CONTACT` | shell only | Contact email in the Open Food Facts User-Agent |

`.env.production` contains only public values and is safe to commit. Never put a
service-role key in a `VITE_*` variable.

## Database setup

Run these in the Supabase SQL editor (or `supabase db push`), in order:

1. `supabase/0000_base_schema.sql` — only for a **fresh** project: profiles, communities,
   members, join requests and orders, profile trigger, community cap and leader reassignment.
   It is idempotent and backfills profiles for existing auth users.
2. `supabase/0001_v2_schema.sql` — catalog, RLS, personal cart, orders + shipments,
   `place_order()`, safe activity view, price snapshots/watches, addresses, shared cart,
   account deletion, optional pg_cron schedule.
3. `supabase/0002_catalog_seed.sql` — stores, 18 products and 108 prices. Generated from
   `src/data/catalog.fallback.json` with `npm run seed:sql`.
4. `supabase/0003_one_line_per_product.sql` — merges duplicate shared-cart rows and adds the
   `shared_cart_one_line` unique index (plus member-wide update/delete policies). Required for
   V14's one-product-one-line rule; the app still works without it but concurrent adds can race.
5. `supabase/0004_price_history_seed.sql` — copies the seeded prices into 30 days of demo history.
   Run it after 0002; it does nothing if snapshots already exist.

If your project already has the original app's base tables (`users`, `communities`,
`community_members`, `join_requests`, `order_events`, `shared_cart_items`), skip `0000` and start
at `0001`. The migrations are idempotent for those objects.

After the SQL, reload the PostgREST schema cache once:

```sql
notify pgrst, 'reload schema';
```

After a schema change, regenerate types:

```bash
supabase gen types typescript --project-id <PROJECT_REF> > src/lib/database.types.ts
```

The checked-in `database.types.ts` is hand-maintained for the V2 shape; keep it in sync if you
change SQL. Use **type aliases** for table rows (not interfaces) — the Supabase generic requires
rows to satisfy `Record<string, unknown>`, and interfaces fail that implicit index check.

### Price simulation

`price_snapshots` is seeded with 30 days of generated history. `simulate_price_tick()` applies a
±3% drift and records a new daily snapshot. If pg_cron is available on your plan the migration
schedules it at 03:00; otherwise run it by hand before a demo:

```sql
select public.simulate_price_tick();
```

Do not schedule this on Vercel — that would tie the demo to the host.

## Product images (Open Food Facts)

`scripts/fetch-images.mjs` reads products missing an image, queries OFF by barcode, and writes
`image_url` + `image_credit_url`.

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... OFF_CONTACT=you@example.com npm run images -- --dry-run
```

- OFF data is ODbL; product images are CC BY-SA.
- Reads require a custom User-Agent and are rate limited — the script waits ~1s per call.
- Add barcodes by hand; name search is fuzzy. Fresh produce usually has no usable OFF image.
- Drop your own photos in `public/images/<productId>.jpg`; the script prefers them.
- Placeholder is a neutral grey block with the product name, never a fake image.
- Attribution appears in the footer, `/legal`, and next to an image source on product pages.

This workspace has no image files yet, so every card currently shows the placeholder. That is
the specified fallback, not a broken image.

## Architecture

```
src/
  lib/          supabase client, typed DB rows, pricing, delivery, cart merge, format, demo data
  types/        domain types (Product, CartItem, Address, Order…)
  state/        Auth, Catalog, Cart, Watches, Toast providers
  hooks/        useOrders, useAddresses, useLocation, usePriceHistory
  components/   header, cart drawer, product card/grid, store picker, SVG chart,
                address picker, order tracker, modals, skeleton/empty/error
  pages/        Home, Product, Checkout, Orders, Watchlist, Profile, Social, Legal, Labs
  styles/       tokens.css + base.css; one CSS Module per component/page
  data/         catalog.fallback.json
supabase/       0001 schema, 0002 seed
scripts/        image fetch, seed SQL generation
```

### Cart model (one engine, two sources)

`CartContext` exposes `items`, `active` (`personal` | `community`), `totals` and the same
mutations to every screen. No checkout-mode toggle and no `app.js`-style duplicate cart.

- Signed out → localStorage. On sign-in, local rows are **merged** into `personal_cart_items`
  using “same product keeps the larger quantity”, then the local copy is cleared.
- Signed in → database rows, Realtime subscription filtered by `user_id`, optimistic local
  state with rollback on error. `localStorage` stays an **instant-paint mirror**: a refresh
  draws the cart before Supabase answers. A `tokri_cart_owner_v1` marker records which account
  owns the mirror so it is never merged back into the server cart (that would resurrect rows
  deleted in another tab).
- If the V2 table is missing, the cart stays local and the drawer explains that it is
  device-only instead of silently pretending to sync.
- Community carts read/write `shared_cart_items`; Realtime subscribes **only** to the active
  community and unsubscribes on switch. Leaving/removal falls back to Personal.
- The active cart choice is persisted, but membership is re-checked before use.

### One product, one line (V14)

- A product has exactly one selected store and one quantity, so it is a single cart line.
  `addCartLine` and `setCartLineQty` in `src/lib/cart.ts` enforce this (quantity caps at 20), and
  `normalizeCartItems` merges legacy duplicate rows defensively.
- The chosen store lives in `selectedStore` (`tokri_store_picks`) and is persisted across reloads.
  The default is the cheapest in-stock store. If that pick goes out of stock, pricing falls back
  to the cheapest available store and the card/cart shows a small notice.
- `selectStore(productId, storeId)` changes the card's store when the product is not in the cart.
  When it is in the cart, the **same row moves** to the new store and keeps its quantity, with a
  “Moved to … · ₹…” toast and Undo. Selecting a store never adds an item.
- `StorePicker` is shared by the card (“Compare N stores”), cart lines (“Change store”) and
  checkout. It sorts by price, marks the cheapest “Best”, disables out-of-stock rows, and behaves
  as a bottom sheet at ≤768 px. It is keyboard-driven (`role="radiogroup"`, ↑/↓, Enter, Esc) and
  returns focus to its opener.
- Shared carts used to keep one row per member; `0003_one_line_per_product.sql` collapses those
  rows and adds a unique index on `(community_id, product_id)`. Adding a product another member
  already added raises the shared quantity instead of creating a second line.

### Persistence, cache and drafts (V11)

- **Write order:** React state → `localStorage` → Supabase. A failed database write rolls the
  cart back and shows a toast instead of leaving the UI and the database disagreeing.
- **Cross-tab / bfcache:** a `storage` event re-reads the cart, and a restored page refetches
  the signed-in cart before it trusts the mirror.
- **Sign-out wipes the device copy:** cart mirror, saved addresses, watch cache, geocode cache,
  local order copies and unfinished form drafts are removed; the server rows stay. This is
  deliberate for a shared computer. Signing in again restores the server cart.
- **Catalog cache:** `tokri:catalog:v1` (`{ savedAt, updatedAt, stores, products }`) paints on
  first render, then revalidates in the background and on tab focus when older than 10 minutes.
  Bump the `v1` suffix whenever `Product`/`Store` change shape. Only public catalog rows are
  cached. If both cache and network fail, the bundled `catalog.fallback.json` is used and the
  page says so.
- **Filters live in the URL:** `?q=milk&cat=dairy&sort=price-asc&store=zepto`. Category, sort and
  store values are validated, so a hand-edited link cannot empty the grid. Back, refresh and
  shared links all restore the same view.
- **Scroll restoration:** `createBrowserRouter` + `<ScrollRestoration>`, keyed by pathname so a
  filter change keeps the reader's place while Back from a product page restores the offset.
- **Theme:** `tokri_theme` (`light` | `dark`) with the OS preference as the default. The inline
  script in `index.html` applies it before first paint, so there is no white flash.
- **Form drafts:** create-community, address and coupon input are saved to `sessionStorage`
  (`tokri:draft:*`), survive refresh/navigation, and are cleared on save, cancel or order.

### Orders

`place_order(p_community_id, p_items, p_amount, p_address_text, p_lat, p_lng)` is one
`SECURITY DEFINER` plpgsql function: insert header, insert one shipment per store with that
store's ETA and fee threshold, delete ordered cart rows, return the order id. The client never
writes a half-order.

Tracking is derived from `order_time + store ETA` (`src/lib/delivery.ts`), not stored status,
so it survives reloads without a cron. Device clock skew is corrected with `server_now()`.

### Privacy and RLS

- Personal carts, addresses, watches, own orders and shipments are owner-only.
- Community carts require membership for read/write.
- `community_activity_feed` exposes only `id, community_id, ordered_by, items, created_at`,
  filtered to communities the caller belongs to. It never exposes amount, address or coordinates.
- Location is click-only, optional for checkout, cached, and stored only on the user's own
  address/order rows. Reverse geocoding uses Nominatim with ~1 request/second and local caching.
- Account deletion is `delete_my_account()` (profile rows + auth user).

### Pricing helpers (Vitest)

`bestPrice`, `selectedPrice`, `groupByStore`, `calculateTotals` (per-store delivery thresholds,
coupons), `unitPrice` (₹/kg, ₹/L) and `bestSplit` (cheapest-per-item, every single-store basket,
all 15 store pairs). Tests also cover delivery stage boundaries, the cart merge rule and the
one-product-one-line helpers (add twice, move store, rapid taps, duplicate merge).

```bash
npm test
npm run typecheck
```

## Feature status

| Area | Status |
|---|---|
| V1 scaffold, strict TS, Vite, SPA rewrite | Done |
| V2 catalog in Postgres + fallback + tests | Code/SQL done; apply migration to go live |
| V3 OFF image script, placeholder, attribution | Script + fallback done; barcodes/photos still to add |
| V4 flat design tokens, no gradients/shadows | Done; greps clean |
| V5 personal cart DB, merge, atomic orders | Done; DB unverified until migration runs |
| V6 cart switching, realtime, community guard | Done; needs a live project to exercise |
| V7 snapshots, watches, SVG chart, in-app alerts | Done; history is simulated |
| V8 click-only location, saved addresses, mock tracker | Done |
| V9 unit price, optimizer, OOS, buy again, profile, legal, a11y, tests | Done |
| V10 parity cleanup, docs | README/docs updated; old static files intentionally retained |
| V11 persistence, catalog cache, URL filters, drafts, theme | Done |
| V14 one product, one cart line, shared store picker | Done; apply `0003` for the shared-cart unique index |

## Known limitations / next checks

- The Supabase project used here does **not** have the V2 tables yet. The app intentionally
  demonstrates the offline fallback. Apply `0001` + `0002` + `0003`, then verify signed-in cart
  sync and community realtime with two accounts.
- Real authentication, community creation/join, member controls and account deletion were not
  exercised in this session because no test account exists.
- No email/push price alerts; alerts are computed in the browser when the app opens.
- Nominatim is fine for low-traffic demo use only; move to a paid geocoder at scale.
- pg_cron availability depends on the Supabase plan; manual tick is the fallback.
- Product images are pending barcodes/photos; placeholders are intentional.
- The old static pages remain at the repository root for reference and have not been deleted.
