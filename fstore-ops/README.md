# Fstore Ops — Local Dashboard

Local tool to track product cost vs. sell price (margin) and follow up Shopify orders.

## Setup (one-time, ~3 min)

1. **Get a Shopify token**: Shopify admin → Settings → Apps and sales channels → Develop apps → Create an app → *Configuration* → Admin API scopes: check `read_products` and `read_orders` → Save → *API credentials* → Install app → copy the **Admin API access token** (starts with `shpat_`).
2. **Configure**: `cp .env.example .env`, then paste your token into `SHOPIFY_ADMIN_TOKEN` (the shop is already set to `fstore-9941.myshopify.com`).
3. **Install + run**:
   ```bash
   npm install
   npm start
   ```
4. Open http://localhost:3000

Requires Node.js ≥ 20.6 (uses `--env-file`).

## What it does

- **Productos**: every product with your cost (editable), Shopify sell price, auto margin/profit, and a link to reorder on AliExpress.
- **Órdenes**: live Shopify orders. Click "Pedir en AliExpress" per item, advance each order through Nueva → Pedida → Enviada → Entregada (+ ⚠ Problema), add tracking + notes. Top bar shows estimated total profit.

Your data (costs, links, order states) lives in `data.json` (created on first run from `data.seed.json`). Back it up by copying that file.
