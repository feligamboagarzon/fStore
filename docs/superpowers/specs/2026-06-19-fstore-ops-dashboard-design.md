# Fstore Ops — Local Dashboard (Design Spec)

- **Date:** 2026-06-19
- **Status:** Approved (pending spec review)
- **Owner:** feli (Fstore — Shopify dropshipping store `fstore-9941`)

## Goal

A small **local-only web app** to help the owner run the Fstore dropshipping store. Two jobs:

1. **Pricing view** — see every product with its **cost** (what they pay on AliExpress) next to its **sell price** (live from Shopify), with **margin / profit** computed automatically, plus the **AliExpress source link** to reorder.
2. **Order followup** — when a Shopify order comes in, see it in the dashboard, click through to each product's AliExpress link to place the supplier order, and **manually advance a workflow state** (Nueva → Pedida → Enviada → Entregada, plus ⚠ Problema), tracking number, and notes. Show an **estimated total-profit summary**.

It is a personal organization tool, not customer-facing.

## Non-goals

- No automatic ordering on AliExpress (links only; owner orders manually).
- No writing back to Shopify (read-only from Shopify; workflow state lives locally).
- No shipping/fee cost in profit math **for now** (profit = sell − cost). Designed so a shipping cost can be added later without schema changes.
- No multi-user/auth, no cloud hosting, no mobile app.

## Approach (chosen)

**Local Node + Express server + Shopify Admin API + local JSON store.** (User-selected over a zero-setup static file and a hybrid, because live orders must appear automatically.)

Rationale: the Shopify Admin API can't be called safely from the browser (CORS + token exposure), so a tiny local server proxies it and holds the token. Volume is low, so a human-readable `data.json` file is used instead of a database.

## Architecture

```
Browser (localhost:3000)
   │  fetch /api/*
   ▼
Express server (Node)
   ├── Shopify Admin GraphQL API  ──(read products, orders)
   └── data.json  ──(owner's overlay: cost, source link, order state/tracking/notes)
```

- The browser only talks to the local server. The Shopify token never leaves the server.
- `GET` endpoints fetch from Shopify, merge the `data.json` overlay, compute derived numbers (margin, profit), and return combined objects.
- `POST` endpoints write the owner's edits to `data.json` (atomic write: temp file + rename).

### Tech choices

- **Backend:** Node.js + Express. Shopify calls via `fetch` to `https://<shop>/admin/api/2024-10/graphql.json` with header `X-Shopify-Access-Token`.
- **Frontend:** one static page, **vanilla HTML/CSS/JS** (no framework, no build step). Two tabs: Productos / Órdenes.
- **Persistence:** `data.json` (gitignored). Seeded on first run from `data.seed.json` (ships the 13 AliExpress source links).
- **Config:** `.env` with `SHOPIFY_SHOP` and `SHOPIFY_ADMIN_TOKEN`. `.env.example` documents it.

## Data model (`data.json`)

```json
{
  "products": {
    "<shopifyProductIdNumeric>": {
      "cost": 6.50,
      "sourceUrl": "https://www.aliexpress.com/item/....html",
      "notes": ""
    }
  },
  "orders": {
    "<shopifyOrderIdNumeric>": {
      "state": "nueva",
      "tracking": "",
      "notes": "",
      "history": [ { "state": "nueva", "at": "2026-06-19T15:00:00.000Z" } ]
    }
  }
}
```

- `cost` is per product (the 13 catalog items are single-variant, so per-product cost is sufficient). Blank/null until the owner fills it in.
- `state` ∈ `nueva | pedida | enviada | entregada | problema`. Default `nueva` for any order not yet in the file.
- Every state change appends to `history` with an ISO timestamp (so the owner sees when each step happened).

## Server API

| Method & path | Does |
|---|---|
| `GET /api/products` | Shopify products (id, title, featured image, handle, `onlineStoreUrl`, admin URL, variant price + compareAt) merged with `data.json.products`; adds computed `margin`, `marginPct`, `profit` (= price − cost) when cost is set. |
| `GET /api/orders` | Shopify orders (name, createdAt, customer name, ship-to city/province/country, line items [product id, title, qty, sold price], total, financial + fulfillment status) merged with `data.json.orders`; adds computed `expectedProfit` = Σ qty × (lineSellPrice − productCost). |
| `POST /api/products/:id` | Body `{ cost?, sourceUrl?, notes? }` → upsert into `data.json.products[id]`. |
| `POST /api/orders/:id` | Body `{ state?, tracking?, notes? }` → upsert into `data.json.orders[id]`; if `state` changed, append to `history`. |
| `GET /` | Serve the dashboard page. |

Shopify scopes required on the custom app: **`read_products`, `read_orders`**.

## Screen 1 — Productos (pricing & margin)

Table, one row per product:

- Thumbnail · Title
- **Costo** (inline-editable number; saved on blur)
- **Venta** (Shopify price, read-only)
- **Tachado** (compareAt, read-only)
- **Ganancia/u** = Venta − Costo, and **Margen %** = (Venta − Costo) / Venta — colored (green ok / amber low / grey if no cost yet)
- **AliExpress** link (opens source listing) · **Shopify** admin link

Top summary: # products, # missing cost, average profit/unit (over products with cost).

## Screen 2 — Órdenes (followup)

- Live orders from Shopify, newest first. New orders show up on refresh.
- **Total-profit summary bar** at the top, showing three fixed numbers (independent of the filter): **Ganancia total estimada** = Σ `expectedProfit` across **all** orders; **Este mes** = same sum limited to orders created in the current calendar month; and **Órdenes** = total order count. A fourth number, **Mostradas**, reflects the currently active filter (Σ profit of the orders visible after filtering), so the owner can total any subset.
- Per-order card:
  - Order # · date · customer · ship-to (city, country)
  - Line items — each row shows qty × title and a **"Pedir en AliExpress"** button using that product's `sourceUrl` (disabled with a hint if no source link set yet)
  - Order total · **Ganancia estimada** (this order) · Shopify paid/fulfillment badges
  - **Estado** selector: `Nueva → Pedida → Enviada → Entregada` + `⚠ Problema`; changing it stamps date/time (shown as a small timeline from `history`)
  - **Tracking #** field + **Notas** field (saved on blur)
- **Filter** chips by state (e.g., show only `Nueva` = orders still to place with the supplier). Default: all, newest first.

## Profit definition (current)

- Per unit: `profit = sellPrice − cost`. Margin % = `profit / sellPrice`.
- Per order: `expectedProfit = Σ lineItem.quantity × (lineItem.sellPrice − product.cost)`.
- If a line item's product has no `cost` set, that line contributes `0` profit and the order is flagged "costo incompleto" so totals aren't silently wrong.
- **No shipping/fees** subtracted now. (Future: a configurable per-order or per-item shipping cost subtracted here.)

## Error handling

- Missing/invalid `.env` or Shopify auth failure → server returns a clear JSON error; UI shows a top banner ("No pude conectar con Shopify — revisa el token en .env") linking to the README.
- Shopify network/error → banner with the message; last successfully loaded data stays visible.
- `data.json` missing → created from `data.seed.json` on boot. Writes are atomic (temp + rename) to avoid corruption.
- Unknown product in an order (e.g., later deleted) → still listed, profit line treated as incomplete.

## Pre-seeded source links (`data.seed.json`)

The 13 current products, keyed by Shopify product id, with their real AliExpress source listing (cost left blank for the owner to fill):

| Shopify product id | Product | sourceUrl |
|---|---|---|
| 7682050850910 | Sunset Projection Lamp | https://www.aliexpress.com/item/1005004140746075.html |
| 7682051211358 | Cordless Spin Scrubber | https://www.aliexpress.com/item/1005006345686181.html |
| 7682051309662 | Reusable Pet Hair Remover | https://www.aliexpress.com/item/1005006583439030.html |
| 7682051342430 | Pulse Neck Massager | https://www.aliexpress.com/item/1005005270342557.html |
| 7682051473502 | Magnetic Car Phone Mount | https://www.aliexpress.com/item/1005006176804563.html |
| 7682051604574 | Cordless Tire Inflator | https://www.aliexpress.com/item/3256807798016820.html |
| 7682051702878 | Hand-Press Veg Chopper | https://www.aliexpress.com/item/1005002974149742.html |
| 7682051768414 | Handheld Mini Fan | https://www.aliexpress.com/item/1005004086279406.html |
| 7682051833950 | Plasma Arc Lighter | https://www.aliexpress.com/item/1005005868416026.html |
| 7682051899486 | Blackhead Remover Vacuum | https://www.aliexpress.com/item/1005004984805335.html |
| 7682051932254 | Bluetooth 5.3 Earbuds | https://www.aliexpress.com/item/1005009212060717.html |
| 7682051965022 | Cryo Ice Roller + Gua Sha | https://www.aliexpress.com/item/1005009920014344.html |
| 7682051997790 | Flame Humidifier/Diffuser | https://www.aliexpress.com/item/1005010169438193.html |

## File layout

```
fstore-ops/
  package.json
  server.js              # Express app + Shopify client + data.json store
  .env.example           # SHOPIFY_SHOP=, SHOPIFY_ADMIN_TOKEN=
  data.seed.json         # 13 source links pre-filled (committed)
  data.json              # owner's live data (gitignored, created on first run)
  public/
    index.html           # two-tab dashboard
    app.js               # fetch + render + edit handlers
    styles.css
  README.md              # 3-minute setup: create custom app, copy token, npm install, npm start
```

## Setup (one-time, ~3 min)

1. Shopify admin → Settings → Apps and sales channels → Develop apps → create an app → Admin API scopes `read_products`, `read_orders` → install → copy the **Admin API access token**.
2. `cp .env.example .env`, paste the token + shop domain (`fstore-9941.myshopify.com`).
3. `npm install` then `npm start` → open `http://localhost:3000`.

## Future (out of scope now)

- Subtract a configurable shipping/fee cost from profit.
- Per-variant cost.
- Export monthly profit report (CSV).
- Optional write-back of tracking to Shopify fulfillment.
