# Fstore Ops Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only Node web app that shows Fstore products with cost vs. sell price + margin, and lets the owner follow up Shopify orders through a manual workflow (Nueva → Pedida → Enviada → Entregada → Problema) with an estimated-profit summary.

**Architecture:** A tiny Express server runs locally, reads products + orders live from the Shopify Admin GraphQL API (token held server-side), and overlays the owner's own data (cost, source link, order state/tracking/notes) from a human-readable `data.json`. A single static page (vanilla HTML/CSS/JS) renders two tabs and posts edits back to the server.

**Tech Stack:** Node.js (≥18, ESM), Express, Shopify Admin GraphQL API 2024-10, built-in `node:test` runner, vanilla front end (no framework, no build step).

## Global Constraints

- Node.js ≥ 18, ES modules (`"type": "module"`); no transpiler/bundler.
- Only runtime dependency: `express`. Tests use built-in `node:test` + `node:assert` (no extra deps).
- Front end is vanilla HTML/CSS/JS — no React/Vue/build step.
- Shopify Admin API version: `2024-10`. Scopes: `read_products`, `read_orders`. Read-only (never writes to Shopify).
- **Profit = sell − cost. No shipping/fees subtracted** (keep the math in one function so shipping can be added later).
- Order states (exact ids): `nueva`, `pedida`, `enviada`, `entregada`, `problema`. Default `nueva`.
- All money rounded to 2 decimals; margin % rounded to whole number.
- The app lives in a new `fstore-ops/` folder at the repo root. `data.json` is gitignored; `data.seed.json` is committed.
- Shop domain: `fstore-9941.myshopify.com`.

---

### Task 1: Project scaffold + seed data

**Files:**
- Create: `fstore-ops/package.json`
- Create: `fstore-ops/.gitignore`
- Create: `fstore-ops/.env.example`
- Create: `fstore-ops/data.seed.json`
- Test: `fstore-ops/test/seed.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `data.seed.json` shape `{ products: { [productId]: { sourceUrl, cost } }, orders: {} }`, consumed by the store (Task 3) and server (Task 5).

- [ ] **Step 1: Create `fstore-ops/package.json`**

```json
{
  "name": "fstore-ops",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
```

- [ ] **Step 2: Create `fstore-ops/.gitignore`**

```
node_modules/
data.json
.env
```

- [ ] **Step 3: Create `fstore-ops/.env.example`**

```
SHOPIFY_SHOP=fstore-9941.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
```

- [ ] **Step 4: Create `fstore-ops/data.seed.json`** (13 products, real AliExpress links, cost null)

```json
{
  "products": {
    "7682050850910": { "sourceUrl": "https://www.aliexpress.com/item/1005004140746075.html", "cost": null },
    "7682051211358": { "sourceUrl": "https://www.aliexpress.com/item/1005006345686181.html", "cost": null },
    "7682051309662": { "sourceUrl": "https://www.aliexpress.com/item/1005006583439030.html", "cost": null },
    "7682051342430": { "sourceUrl": "https://www.aliexpress.com/item/1005005270342557.html", "cost": null },
    "7682051473502": { "sourceUrl": "https://www.aliexpress.com/item/1005006176804563.html", "cost": null },
    "7682051604574": { "sourceUrl": "https://www.aliexpress.com/item/3256807798016820.html", "cost": null },
    "7682051702878": { "sourceUrl": "https://www.aliexpress.com/item/1005002974149742.html", "cost": null },
    "7682051768414": { "sourceUrl": "https://www.aliexpress.com/item/1005004086279406.html", "cost": null },
    "7682051833950": { "sourceUrl": "https://www.aliexpress.com/item/1005005868416026.html", "cost": null },
    "7682051899486": { "sourceUrl": "https://www.aliexpress.com/item/1005004984805335.html", "cost": null },
    "7682051932254": { "sourceUrl": "https://www.aliexpress.com/item/1005009212060717.html", "cost": null },
    "7682051965022": { "sourceUrl": "https://www.aliexpress.com/item/1005009920014344.html", "cost": null },
    "7682051997790": { "sourceUrl": "https://www.aliexpress.com/item/1005010169438193.html", "cost": null }
  },
  "orders": {}
}
```

- [ ] **Step 5: Write the failing test `fstore-ops/test/seed.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('seed has 13 products each with a sourceUrl', async () => {
  const seed = JSON.parse(await readFile(new URL('../data.seed.json', import.meta.url)));
  const ids = Object.keys(seed.products);
  assert.equal(ids.length, 13);
  for (const id of ids) {
    assert.match(seed.products[id].sourceUrl, /aliexpress\.com\/item\//);
  }
  assert.deepEqual(seed.orders, {});
});
```

- [ ] **Step 6: Install deps and run test**

Run: `cd fstore-ops && npm install && npm test`
Expected: PASS (1 test). `npm install` pulls express.

- [ ] **Step 7: Commit**

```bash
git add fstore-ops/package.json fstore-ops/.gitignore fstore-ops/.env.example fstore-ops/data.seed.json fstore-ops/test/seed.test.js
git commit -m "feat(ops): scaffold fstore-ops with seeded source links"
```

---

### Task 2: Profit/compute module

**Files:**
- Create: `fstore-ops/lib/compute.js`
- Test: `fstore-ops/test/compute.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `productProfit(price: number, cost: number|null) => { profit: number|null, marginPct: number|null }`
  - `orderExpectedProfit(lineItems: {quantity:number, sellPrice:number, productId:string|null}[], costByProductId: Record<string, number|null>) => { expectedProfit: number, incomplete: boolean }`
  - `isInCurrentMonth(iso: string, now: Date) => boolean`

- [ ] **Step 1: Write the failing test `fstore-ops/test/compute.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productProfit, orderExpectedProfit, isInCurrentMonth } from '../lib/compute.js';

test('productProfit computes profit and margin', () => {
  assert.deepEqual(productProfit(24.99, 6.5), { profit: 18.49, marginPct: 74 });
});

test('productProfit returns nulls when cost missing', () => {
  assert.deepEqual(productProfit(24.99, null), { profit: null, marginPct: null });
});

test('orderExpectedProfit sums lines and flags incomplete', () => {
  const lines = [
    { quantity: 2, sellPrice: 24.99, productId: 'A' },
    { quantity: 1, sellPrice: 19.99, productId: 'B' },
  ];
  const out = orderExpectedProfit(lines, { A: 6.5, B: null });
  assert.equal(out.expectedProfit, 36.98); // 2*(24.99-6.5) = 36.98; B incomplete -> 0
  assert.equal(out.incomplete, true);
});

test('isInCurrentMonth respects provided now', () => {
  const now = new Date('2026-06-19T12:00:00');
  assert.equal(isInCurrentMonth('2026-06-01T00:00:00', now), true);
  assert.equal(isInCurrentMonth('2026-05-31T23:59:59', now), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fstore-ops && node --test test/compute.test.js`
Expected: FAIL with "Cannot find module '../lib/compute.js'".

- [ ] **Step 3: Write `fstore-ops/lib/compute.js`**

```js
const round2 = (n) => Math.round(n * 100) / 100;

export function productProfit(price, cost) {
  if (cost == null || Number.isNaN(Number(cost))) {
    return { profit: null, marginPct: null };
  }
  const profit = round2(price - Number(cost));
  const marginPct = price > 0 ? Math.round((profit / price) * 100) : null;
  return { profit, marginPct };
}

export function orderExpectedProfit(lineItems, costByProductId) {
  let expectedProfit = 0;
  let incomplete = false;
  for (const li of lineItems) {
    const cost = li.productId != null ? costByProductId[li.productId] : null;
    if (cost == null || Number.isNaN(Number(cost))) {
      incomplete = true;
      continue;
    }
    expectedProfit += li.quantity * (li.sellPrice - Number(cost));
  }
  return { expectedProfit: round2(expectedProfit), incomplete };
}

export function isInCurrentMonth(iso, now) {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fstore-ops && node --test test/compute.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add fstore-ops/lib/compute.js fstore-ops/test/compute.test.js
git commit -m "feat(ops): profit + margin compute module"
```

---

### Task 3: JSON data store

**Files:**
- Create: `fstore-ops/lib/store.js`
- Test: `fstore-ops/test/store.test.js`

**Interfaces:**
- Consumes: a seed file in the `data.seed.json` shape (Task 1).
- Produces: `createStore(dataPath: string, seedPath: string) => Promise<Store>` where `Store` has:
  - `getAll() => { products: Record<string,{cost,sourceUrl,notes}>, orders: Record<string,{state,tracking,notes,history}> }`
  - `upsertProduct(id: string, patch: object) => Promise<object>`
  - `upsertOrder(id: string, patch: object, now?: Date) => Promise<object>` (appends `{state, at}` to `history` when `patch.state` differs from current)

- [ ] **Step 1: Write the failing test `fstore-ops/test/store.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../lib/store.js';

async function freshStore() {
  const dir = await mkdtemp(join(tmpdir(), 'ops-'));
  const seedPath = join(dir, 'seed.json');
  const dataPath = join(dir, 'data.json');
  await writeFile(seedPath, JSON.stringify({ products: { P1: { sourceUrl: 'u', cost: null } }, orders: {} }));
  return { store: await createStore(dataPath, seedPath), dataPath };
}

test('first load seeds data.json from seed', async () => {
  const { store, dataPath } = await freshStore();
  assert.equal(store.getAll().products.P1.sourceUrl, 'u');
  const written = JSON.parse(await readFile(dataPath, 'utf8'));
  assert.equal(written.products.P1.sourceUrl, 'u');
});

test('upsertProduct merges and persists', async () => {
  const { store, dataPath } = await freshStore();
  await store.upsertProduct('P1', { cost: 6.5 });
  assert.equal(store.getAll().products.P1.cost, 6.5);
  assert.equal(store.getAll().products.P1.sourceUrl, 'u'); // kept
  const written = JSON.parse(await readFile(dataPath, 'utf8'));
  assert.equal(written.products.P1.cost, 6.5);
});

test('upsertOrder appends history on state change', async () => {
  const { store } = await freshStore();
  const now = new Date('2026-06-19T10:00:00Z');
  const o1 = await store.upsertOrder('O1', { state: 'pedida' }, now);
  assert.equal(o1.state, 'pedida');
  assert.equal(o1.history.at(-1).state, 'pedida');
  const o2 = await store.upsertOrder('O1', { tracking: 'ZZ1' }, now);
  assert.equal(o2.history.length, o1.history.length); // no new history when state unchanged
  assert.equal(o2.tracking, 'ZZ1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fstore-ops && node --test test/store.test.js`
Expected: FAIL with "Cannot find module '../lib/store.js'".

- [ ] **Step 3: Write `fstore-ops/lib/store.js`**

```js
import { readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export async function createStore(dataPath, seedPath) {
  let data;
  if (existsSync(dataPath)) {
    data = JSON.parse(await readFile(dataPath, 'utf8'));
  } else {
    data = JSON.parse(await readFile(seedPath, 'utf8'));
  }
  if (!data.products) data.products = {};
  if (!data.orders) data.orders = {};

  async function persist() {
    const tmp = `${dataPath}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2));
    await rename(tmp, dataPath);
  }
  if (!existsSync(dataPath)) await persist();

  return {
    getAll: () => data,
    async upsertProduct(id, patch) {
      data.products[id] = { ...(data.products[id] || {}), ...patch };
      await persist();
      return data.products[id];
    },
    async upsertOrder(id, patch, now = new Date()) {
      const cur = data.orders[id] || {
        state: 'nueva', tracking: '', notes: '',
        history: [{ state: 'nueva', at: now.toISOString() }],
      };
      const next = { ...cur, ...patch };
      if (patch.state && patch.state !== cur.state) {
        next.history = [...(cur.history || []), { state: patch.state, at: now.toISOString() }];
      }
      data.orders[id] = next;
      await persist();
      return next;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fstore-ops && node --test test/store.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add fstore-ops/lib/store.js fstore-ops/test/store.test.js
git commit -m "feat(ops): atomic json data store with order history"
```

---

### Task 4: Shopify client (normalize + fetch)

**Files:**
- Create: `fstore-ops/lib/shopify.js`
- Test: `fstore-ops/test/shopify.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `normalizeProduct(node, shop) => { id, title, image, handle, onlineStoreUrl, adminUrl, price, compareAtPrice }`
  - `normalizeOrder(node) => { id, name, createdAt, customer, shipTo, financialStatus, fulfillmentStatus, total, currency, lineItems: {title,quantity,sellPrice,productId}[] }`
  - `createShopifyClient({ shop, token }, fetchFn=fetch) => { fetchProducts(): Promise<Product[]>, fetchOrders(): Promise<Order[]> }`

- [ ] **Step 1: Write the failing test `fstore-ops/test/shopify.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProduct, normalizeOrder, createShopifyClient } from '../lib/shopify.js';

test('normalizeProduct flattens first variant + builds admin url', () => {
  const node = {
    id: 'gid://shopify/Product/77', title: 'Lamp', handle: 'lamp',
    featuredImage: { url: 'http://img/x.jpg' }, onlineStoreUrl: 'http://shop/p',
    variants: { edges: [{ node: { price: '24.99', compareAtPrice: '49.99' } }] },
  };
  const p = normalizeProduct(node, 'fstore-9941.myshopify.com');
  assert.equal(p.id, '77');
  assert.equal(p.price, 24.99);
  assert.equal(p.compareAtPrice, 49.99);
  assert.equal(p.adminUrl, 'https://fstore-9941.myshopify.com/admin/products/77');
});

test('normalizeOrder flattens line items with product id + sell price', () => {
  const node = {
    id: 'gid://shopify/Order/9', name: '#1001', createdAt: '2026-06-19T10:00:00Z',
    displayFinancialStatus: 'PAID', displayFulfillmentStatus: 'UNFULFILLED',
    customer: { displayName: 'Ana' }, shippingAddress: { city: 'Miami', country: 'United States' },
    totalPriceSet: { shopMoney: { amount: '49.98', currencyCode: 'USD' } },
    lineItems: { edges: [{ node: { title: 'Lamp', quantity: 2, originalUnitPriceSet: { shopMoney: { amount: '24.99' } }, product: { id: 'gid://shopify/Product/77' } } }] },
  };
  const o = normalizeOrder(node);
  assert.equal(o.id, '9');
  assert.equal(o.customer, 'Ana');
  assert.equal(o.shipTo, 'Miami, United States');
  assert.equal(o.lineItems[0].productId, '77');
  assert.equal(o.lineItems[0].sellPrice, 24.99);
});

test('createShopifyClient.fetchProducts uses injected fetch', async () => {
  const fakeFetch = async () => ({
    ok: true,
    json: async () => ({ data: { products: { edges: [{ node: {
      id: 'gid://shopify/Product/77', title: 'Lamp', handle: 'lamp', featuredImage: null, onlineStoreUrl: null,
      variants: { edges: [{ node: { price: '10.00', compareAtPrice: null } }] } } }] } } }),
  });
  const client = createShopifyClient({ shop: 's.myshopify.com', token: 't' }, fakeFetch);
  const products = await client.fetchProducts();
  assert.equal(products.length, 1);
  assert.equal(products[0].price, 10);
});

test('client throws a clear error on HTTP failure', async () => {
  const fakeFetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  const client = createShopifyClient({ shop: 's', token: 't' }, fakeFetch);
  await assert.rejects(() => client.fetchProducts(), /Shopify HTTP 401/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fstore-ops && node --test test/shopify.test.js`
Expected: FAIL with "Cannot find module '../lib/shopify.js'".

- [ ] **Step 3: Write `fstore-ops/lib/shopify.js`**

```js
const API_VERSION = '2024-10';
const num = (v) => (v == null ? null : Number(v));
const gidTail = (gid) => (gid ? String(gid).split('/').pop() : null);

export function normalizeProduct(node, shop) {
  const v = node.variants?.edges?.[0]?.node || {};
  const id = gidTail(node.id);
  return {
    id,
    title: node.title,
    image: node.featuredImage?.url || null,
    handle: node.handle,
    onlineStoreUrl: node.onlineStoreUrl || null,
    adminUrl: `https://${shop}/admin/products/${id}`,
    price: num(v.price),
    compareAtPrice: num(v.compareAtPrice),
  };
}

export function normalizeOrder(node) {
  const addr = node.shippingAddress;
  return {
    id: gidTail(node.id),
    name: node.name,
    createdAt: node.createdAt,
    customer: node.customer?.displayName || 'Invitado',
    shipTo: addr ? [addr.city, addr.country].filter(Boolean).join(', ') : '',
    financialStatus: node.displayFinancialStatus || null,
    fulfillmentStatus: node.displayFulfillmentStatus || null,
    total: Number(node.totalPriceSet?.shopMoney?.amount || 0),
    currency: node.totalPriceSet?.shopMoney?.currencyCode || 'USD',
    lineItems: (node.lineItems?.edges || []).map((e) => ({
      title: e.node.title,
      quantity: e.node.quantity,
      sellPrice: Number(e.node.originalUnitPriceSet?.shopMoney?.amount || 0),
      productId: gidTail(e.node.product?.id),
    })),
  };
}

const PRODUCTS_QUERY = `{
  products(first: 100) { edges { node {
    id title handle onlineStoreUrl
    featuredImage { url }
    variants(first: 1) { edges { node { price compareAtPrice } } }
  } } }
}`;

const ORDERS_QUERY = `{
  orders(first: 100, sortKey: CREATED_AT, reverse: true) { edges { node {
    id name createdAt displayFinancialStatus displayFulfillmentStatus
    customer { displayName }
    shippingAddress { city country }
    totalPriceSet { shopMoney { amount currencyCode } }
    lineItems(first: 20) { edges { node {
      title quantity
      originalUnitPriceSet { shopMoney { amount } }
      product { id }
    } } }
  } } }
}`;

async function gql({ shop, token }, query, fetchFn) {
  const res = await fetchFn(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Shopify HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error('Shopify GraphQL error: ' + JSON.stringify(json.errors));
  return json.data;
}

export function createShopifyClient(cfg, fetchFn = fetch) {
  return {
    async fetchProducts() {
      const data = await gql(cfg, PRODUCTS_QUERY, fetchFn);
      return data.products.edges.map((e) => normalizeProduct(e.node, cfg.shop));
    },
    async fetchOrders() {
      const data = await gql(cfg, ORDERS_QUERY, fetchFn);
      return data.orders.edges.map((e) => normalizeOrder(e.node));
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fstore-ops && node --test test/shopify.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add fstore-ops/lib/shopify.js fstore-ops/test/shopify.test.js
git commit -m "feat(ops): shopify admin client with normalizers"
```

---

### Task 5: Express app factory + API

**Files:**
- Create: `fstore-ops/app.js`
- Test: `fstore-ops/test/app.test.js`

**Interfaces:**
- Consumes: `Store` (Task 3), a shopify client with `fetchProducts()/fetchOrders()` (Task 4), `productProfit`/`orderExpectedProfit`/`isInCurrentMonth` (Task 2).
- Produces: `createApp({ store, shopify, publicDir }) => express.Application` exposing:
  - `GET /api/products` → product rows with `cost, sourceUrl, notes, profit, marginPct`
  - `GET /api/orders` → `{ orders: [...with state, tracking, notes, history, expectedProfit, incomplete], summary: { total, month, count } }`
  - `POST /api/products/:id` (json body `{cost?, sourceUrl?, notes?}`)
  - `POST /api/orders/:id` (json body `{state?, tracking?, notes?}`)
  - static files from `publicDir`

- [ ] **Step 1: Write the failing test `fstore-ops/test/app.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from '../lib/store.js';
import { createApp } from '../app.js';

async function harness() {
  const dir = await mkdtemp(join(tmpdir(), 'ops-app-'));
  const seedPath = join(dir, 'seed.json');
  await writeFile(seedPath, JSON.stringify({
    products: { '77': { sourceUrl: 'http://ali/77', cost: 6.5 } }, orders: {},
  }));
  const store = await createStore(join(dir, 'data.json'), seedPath);
  const shopify = {
    fetchProducts: async () => [{ id: '77', title: 'Lamp', image: null, handle: 'lamp', onlineStoreUrl: null, adminUrl: 'http://a', price: 24.99, compareAtPrice: 49.99 }],
    fetchOrders: async () => [{ id: 'O1', name: '#1001', createdAt: new Date().toISOString(), customer: 'Ana', shipTo: 'Miami', financialStatus: 'PAID', fulfillmentStatus: 'UNFULFILLED', total: 24.99, currency: 'USD', lineItems: [{ title: 'Lamp', quantity: 1, sellPrice: 24.99, productId: '77' }] }],
  };
  const app = createApp({ store, shopify, publicDir: dir });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, server };
}

test('GET /api/products merges cost + computes profit', async () => {
  const { base, server } = await harness();
  const rows = await (await fetch(`${base}/api/products`)).json();
  assert.equal(rows[0].cost, 6.5);
  assert.equal(rows[0].profit, 18.49);
  assert.equal(rows[0].sourceUrl, 'http://ali/77');
  server.close();
});

test('GET /api/orders computes expectedProfit + summary', async () => {
  const { base, server } = await harness();
  const body = await (await fetch(`${base}/api/orders`)).json();
  assert.equal(body.orders[0].state, 'nueva');
  assert.equal(body.orders[0].expectedProfit, 18.49);
  assert.equal(body.summary.total, 18.49);
  assert.equal(body.summary.count, 1);
  server.close();
});

test('POST /api/orders/:id changes state + persists history', async () => {
  const { base, server } = await harness();
  const res = await fetch(`${base}/api/orders/O1`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'pedida' }),
  });
  const saved = await res.json();
  assert.equal(saved.state, 'pedida');
  assert.equal(saved.history.at(-1).state, 'pedida');
  server.close();
});

test('POST /api/products/:id saves cost', async () => {
  const { base, server } = await harness();
  const res = await fetch(`${base}/api/products/77`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cost: 7 }),
  });
  const saved = await res.json();
  assert.equal(saved.cost, 7);
  server.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd fstore-ops && node --test test/app.test.js`
Expected: FAIL with "Cannot find module '../app.js'".

- [ ] **Step 3: Write `fstore-ops/app.js`**

```js
import express from 'express';
import { productProfit, orderExpectedProfit, isInCurrentMonth } from './lib/compute.js';

export function createApp({ store, shopify, publicDir }) {
  const app = express();
  app.use(express.json());

  app.get('/api/products', async (_req, res) => {
    try {
      const products = await shopify.fetchProducts();
      const overlay = store.getAll().products;
      res.json(products.map((p) => {
        const o = overlay[p.id] || {};
        const cost = o.cost ?? null;
        const { profit, marginPct } = productProfit(p.price ?? 0, cost);
        return { ...p, cost, sourceUrl: o.sourceUrl || '', notes: o.notes || '', profit, marginPct };
      }));
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  app.get('/api/orders', async (_req, res) => {
    try {
      const [orders, products] = await Promise.all([shopify.fetchOrders(), shopify.fetchProducts()]);
      const overlay = store.getAll();
      const costById = {};
      for (const p of products) costById[p.id] = overlay.products[p.id]?.cost ?? null;
      const now = new Date();
      let total = 0, month = 0;
      const rows = orders.map((ord) => {
        const own = overlay.orders[ord.id] || { state: 'nueva', tracking: '', notes: '', history: [] };
        const { expectedProfit, incomplete } = orderExpectedProfit(ord.lineItems, costById);
        total += expectedProfit;
        if (isInCurrentMonth(ord.createdAt, now)) month += expectedProfit;
        const lineItems = ord.lineItems.map((li) => ({
          ...li,
          sourceUrl: overlay.products[li.productId]?.sourceUrl || '',
        }));
        return { ...ord, lineItems, ...own, expectedProfit, incomplete };
      });
      res.json({ orders: rows, summary: { total: Math.round(total * 100) / 100, month: Math.round(month * 100) / 100, count: rows.length } });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  app.post('/api/products/:id', async (req, res) => {
    const patch = {};
    if (req.body.cost !== undefined) patch.cost = req.body.cost === '' || req.body.cost === null ? null : Number(req.body.cost);
    if (req.body.sourceUrl !== undefined) patch.sourceUrl = req.body.sourceUrl;
    if (req.body.notes !== undefined) patch.notes = req.body.notes;
    res.json(await store.upsertProduct(req.params.id, patch));
  });

  app.post('/api/orders/:id', async (req, res) => {
    const allowed = ['nueva', 'pedida', 'enviada', 'entregada', 'problema'];
    const patch = {};
    if (req.body.state !== undefined) {
      if (!allowed.includes(req.body.state)) return res.status(400).json({ error: 'invalid state' });
      patch.state = req.body.state;
    }
    if (req.body.tracking !== undefined) patch.tracking = req.body.tracking;
    if (req.body.notes !== undefined) patch.notes = req.body.notes;
    res.json(await store.upsertOrder(req.params.id, patch));
  });

  app.use(express.static(publicDir));
  return app;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd fstore-ops && node --test test/app.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full suite**

Run: `cd fstore-ops && npm test`
Expected: PASS (all tests across files).

- [ ] **Step 6: Commit**

```bash
git add fstore-ops/app.js fstore-ops/test/app.test.js
git commit -m "feat(ops): express api with product/order merge + summary"
```

---

### Task 6: Server boot + README

**Files:**
- Create: `fstore-ops/server.js`
- Create: `fstore-ops/README.md`

**Interfaces:**
- Consumes: `createApp` (Task 5), `createStore` (Task 3), `createShopifyClient` (Task 4); env `SHOPIFY_SHOP`, `SHOPIFY_ADMIN_TOKEN`, `PORT`.
- Produces: a runnable `node server.js`.

- [ ] **Step 1: Write `fstore-ops/server.js`**

```js
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createStore } from './lib/store.js';
import { createShopifyClient } from './lib/shopify.js';
import { createApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOP = process.env.SHOPIFY_SHOP;
const TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const PORT = process.env.PORT || 3000;

if (!SHOP || !TOKEN) {
  console.error('Missing SHOPIFY_SHOP or SHOPIFY_ADMIN_TOKEN. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const store = await createStore(join(__dirname, 'data.json'), join(__dirname, 'data.seed.json'));
const shopify = createShopifyClient({ shop: SHOP, token: TOKEN });
const app = createApp({ store, shopify, publicDir: join(__dirname, 'public') });

app.listen(PORT, () => console.log(`Fstore Ops running at http://localhost:${PORT}`));
```

> Note: `.env` is loaded by running with `node --env-file=.env server.js` (Node ≥ 20.6) — documented in the README and the npm script update below.

- [ ] **Step 2: Update the `start` script in `fstore-ops/package.json`**

Change `"start": "node server.js"` to:

```json
    "start": "node --env-file=.env server.js",
```

- [ ] **Step 3: Write `fstore-ops/README.md`**

```markdown
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
```

- [ ] **Step 4: Manual smoke test (no real token needed yet)**

Run: `cd fstore-ops && SHOPIFY_SHOP=x SHOPIFY_ADMIN_TOKEN=y node server.js`
Expected: prints `Fstore Ops running at http://localhost:3000`. Stop with Ctrl-C. (Hitting `/api/products` would error against the fake token — that's verified end-to-end in Task 7 with the real token.)

- [ ] **Step 5: Commit**

```bash
git add fstore-ops/server.js fstore-ops/package.json fstore-ops/README.md
git commit -m "feat(ops): server boot + setup readme"
```

---

### Task 7: Front end (two-tab dashboard)

**Files:**
- Create: `fstore-ops/public/index.html`
- Create: `fstore-ops/public/styles.css`
- Create: `fstore-ops/public/main.js`

**Interfaces:**
- Consumes: `GET/POST /api/products`, `GET/POST /api/orders` (Task 5).
- Produces: the browser UI. (Pure render helpers `fmtMoney`, `marginClass` live in `main.js`; verified manually.)

- [ ] **Step 1: Write `fstore-ops/public/index.html`**

```html
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fstore Ops</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header>
    <h1>Fstore Ops</h1>
    <nav>
      <button class="tab active" data-tab="productos">Productos</button>
      <button class="tab" data-tab="ordenes">Órdenes</button>
      <button id="refresh">↻ Actualizar</button>
    </nav>
  </header>
  <div id="banner" class="banner hidden"></div>
  <main>
    <section id="productos" class="view">
      <div id="prod-summary" class="summary"></div>
      <div id="prod-table"></div>
    </section>
    <section id="ordenes" class="view hidden">
      <div id="ord-summary" class="summary"></div>
      <div id="ord-filters" class="filters"></div>
      <div id="ord-list"></div>
    </section>
  </main>
  <script src="main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `fstore-ops/public/styles.css`**

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #0a0a0b; background: #f6f6f4; }
header { display: flex; align-items: center; gap: 16px; padding: 12px 20px; background: #0a0a0b; color: #fff; position: sticky; top: 0; }
header h1 { font-size: 18px; margin: 0; }
nav { display: flex; gap: 8px; margin-left: auto; }
nav button { background: #1d1d20; color: #fff; border: 1px solid #333; border-radius: 8px; padding: 8px 14px; cursor: pointer; }
nav button.tab.active { background: #c6ff3a; color: #0a0a0b; border-color: #c6ff3a; }
main { padding: 20px; max-width: 1200px; margin: 0 auto; }
.view.hidden, .hidden { display: none; }
.banner { background: #ffe0e0; color: #a00; padding: 12px 16px; border-radius: 8px; margin: 12px 20px; }
.summary { display: flex; gap: 24px; flex-wrap: wrap; padding: 14px 16px; background: #fff; border-radius: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.summary b { font-size: 20px; display: block; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; }
th { background: #fafafa; }
td img { width: 44px; height: 44px; object-fit: cover; border-radius: 8px; }
input.cost { width: 80px; padding: 6px; border: 1px solid #ccc; border-radius: 6px; }
.m-ok { color: #1a7f37; font-weight: 700; }
.m-low { color: #b26a00; font-weight: 700; }
.m-none { color: #999; }
.card { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.card h3 { margin: 0 0 4px; }
.li { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 14px; }
.li a { margin-left: auto; background: #c6ff3a; color: #0a0a0b; text-decoration: none; padding: 5px 10px; border-radius: 8px; font-weight: 600; }
.li a.disabled { background: #eee; color: #999; pointer-events: none; }
.states { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0; }
.states button { border: 1px solid #ccc; background: #fff; border-radius: 999px; padding: 6px 12px; cursor: pointer; }
.states button.on { background: #0a0a0b; color: #fff; border-color: #0a0a0b; }
.states button.problema.on { background: #c0392b; border-color: #c0392b; }
.row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.row input { padding: 6px; border: 1px solid #ccc; border-radius: 6px; }
.filters button { margin-right: 6px; border: 1px solid #ccc; background: #fff; border-radius: 999px; padding: 6px 12px; cursor: pointer; }
.filters button.on { background: #0a0a0b; color: #fff; }
.badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #eee; }
.incomplete { color: #b26a00; font-size: 12px; }
```

- [ ] **Step 3: Write `fstore-ops/public/main.js`**

```js
const STATES = [
  { id: 'nueva', label: 'Nueva' },
  { id: 'pedida', label: 'Pedida' },
  { id: 'enviada', label: 'Enviada' },
  { id: 'entregada', label: 'Entregada' },
  { id: 'problema', label: '⚠ Problema' },
];

export const fmtMoney = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`);
export const marginClass = (pct) => (pct == null ? 'm-none' : pct >= 50 ? 'm-ok' : 'm-low');

const $ = (sel) => document.querySelector(sel);
let currentFilter = 'todos';

function showBanner(msg) { const b = $('#banner'); b.textContent = msg; b.classList.remove('hidden'); }
function clearBanner() { $('#banner').classList.add('hidden'); }

async function loadProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) return showBanner('No pude conectar con Shopify — revisa el token en .env (ver README).');
  clearBanner();
  const rows = await res.json();
  const withCost = rows.filter((r) => r.cost != null);
  const avg = withCost.length ? withCost.reduce((s, r) => s + r.profit, 0) / withCost.length : 0;
  $('#prod-summary').innerHTML =
    `<div><b>${rows.length}</b>Productos</div>` +
    `<div><b>${rows.length - withCost.length}</b>Sin costo</div>` +
    `<div><b>${fmtMoney(avg)}</b>Ganancia/u promedio</div>`;
  $('#prod-table').innerHTML = `<table><thead><tr>
      <th></th><th>Producto</th><th>Costo</th><th>Venta</th><th>Tachado</th><th>Ganancia/u</th><th>Margen</th><th>Links</th>
    </tr></thead><tbody>${rows.map(rowHtml).join('')}</tbody></table>`;
  for (const inp of document.querySelectorAll('input.cost')) {
    inp.addEventListener('change', async () => {
      await fetch(`/api/products/${inp.dataset.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cost: inp.value }),
      });
      loadProducts();
    });
  }
}

function rowHtml(r) {
  const ali = r.sourceUrl ? `<a href="${r.sourceUrl}" target="_blank" rel="noopener">AliExpress</a>` : '';
  const admin = `<a href="${r.adminUrl}" target="_blank" rel="noopener">Shopify</a>`;
  return `<tr>
    <td>${r.image ? `<img src="${r.image}" alt="">` : ''}</td>
    <td>${r.title}</td>
    <td><input class="cost" type="number" step="0.01" min="0" value="${r.cost ?? ''}" data-id="${r.id}" placeholder="—"></td>
    <td>${fmtMoney(r.price)}</td>
    <td>${fmtMoney(r.compareAtPrice)}</td>
    <td class="${marginClass(r.marginPct)}">${fmtMoney(r.profit)}</td>
    <td class="${marginClass(r.marginPct)}">${r.marginPct == null ? '—' : r.marginPct + '%'}</td>
    <td>${ali} ${admin}</td>
  </tr>`;
}

async function loadOrders() {
  const res = await fetch('/api/orders');
  if (!res.ok) return showBanner('No pude conectar con Shopify — revisa el token en .env (ver README).');
  clearBanner();
  const { orders, summary } = await res.json();
  $('#ord-summary').innerHTML =
    `<div><b>${fmtMoney(summary.total)}</b>Ganancia total estimada</div>` +
    `<div><b>${fmtMoney(summary.month)}</b>Este mes</div>` +
    `<div><b>${summary.count}</b>Órdenes</div>` +
    `<div><b id="shown">—</b>Mostradas</div>`;
  const counts = { todos: orders.length };
  for (const s of STATES) counts[s.id] = orders.filter((o) => o.state === s.id).length;
  $('#ord-filters').innerHTML = [['todos', 'Todas'], ...STATES.map((s) => [s.id, s.label])]
    .map(([id, label]) => `<button class="${id === currentFilter ? 'on' : ''}" data-f="${id}">${label} (${counts[id] ?? 0})</button>`).join('');
  for (const b of document.querySelectorAll('#ord-filters button')) {
    b.addEventListener('click', () => { currentFilter = b.dataset.f; renderOrders(orders); });
  }
  renderOrders(orders);
}

function renderOrders(orders) {
  const list = currentFilter === 'todos' ? orders : orders.filter((o) => o.state === currentFilter);
  const shown = list.reduce((s, o) => s + o.expectedProfit, 0);
  const el = document.getElementById('shown');
  if (el) el.textContent = fmtMoney(Math.round(shown * 100) / 100);
  $('#ord-list').innerHTML = list.map(orderHtml).join('') || '<p>Sin órdenes en este filtro.</p>';
  for (const card of document.querySelectorAll('.card[data-order]')) wireOrderCard(card);
}

function orderHtml(o) {
  const date = new Date(o.createdAt).toLocaleString();
  const items = o.lineItems.map((li) => {
    const link = li.sourceUrl
      ? `<a href="${li.sourceUrl}" target="_blank" rel="noopener">Pedir en AliExpress</a>`
      : `<a class="disabled" title="Sin link de proveedor">Sin link</a>`;
    return `<div class="li"><span>${li.quantity}× ${li.title}</span>${link}</div>`;
  }).join('');
  const states = STATES.map((s) =>
    `<button class="${s.id} ${o.state === s.id ? 'on' : ''}" data-state="${s.id}">${s.label}</button>`).join('');
  return `<div class="card" data-order="${o.id}">
    <h3>${o.name} · ${fmtMoney(o.total)} <span class="badge">${o.financialStatus || ''}</span> <span class="badge">${o.fulfillmentStatus || ''}</span></h3>
    <div>${date} · ${o.customer} · ${o.shipTo}</div>
    <div style="margin:8px 0">${items}</div>
    <div>Ganancia estimada: <b class="${o.expectedProfit >= 0 ? 'm-ok' : 'm-low'}">${fmtMoney(o.expectedProfit)}</b>
      ${o.incomplete ? '<span class="incomplete">· costo incompleto</span>' : ''}</div>
    <div class="states">${states}</div>
    <div class="row">
      <input class="tracking" placeholder="Tracking #" value="${o.tracking || ''}">
      <input class="notes" placeholder="Notas" value="${o.notes || ''}" style="flex:1">
    </div>
  </div>`;
}

function wireOrderCard(card) {
  const id = card.dataset.order;
  const save = (body) => fetch(`/api/orders/${id}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  for (const b of card.querySelectorAll('.states button')) {
    b.addEventListener('click', async () => { await save({ state: b.dataset.state }); loadOrders(); });
  }
  card.querySelector('.tracking').addEventListener('change', (e) => save({ tracking: e.target.value }));
  card.querySelector('.notes').addEventListener('change', (e) => save({ notes: e.target.value }));
}

function switchTab(tab) {
  for (const t of document.querySelectorAll('.tab')) t.classList.toggle('active', t.dataset.tab === tab);
  $('#productos').classList.toggle('hidden', tab !== 'productos');
  $('#ordenes').classList.toggle('hidden', tab !== 'ordenes');
  (tab === 'productos' ? loadProducts : loadOrders)();
}

for (const t of document.querySelectorAll('.tab')) t.addEventListener('click', () => switchTab(t.dataset.tab));
$('#refresh').addEventListener('click', () => switchTab(document.querySelector('.tab.active').dataset.tab));
loadProducts();
```

> Note: `main.js` runs as a classic script (not a module) so the browser executes the bottom wiring. The `export` keywords on `fmtMoney`/`marginClass` are harmless in modern browsers only under modules — to keep this a classic script, **remove the `export` keywords** in the browser file and keep them only if you add `type="module"` to the `<script>` tag. For this app, change the `<script>` tag in `index.html` to `<script type="module" src="main.js"></script>` so the `export`s are valid and wiring still runs.

- [ ] **Step 4: Apply the module-script fix from the note**

In `fstore-ops/public/index.html`, change:
```html
  <script src="main.js"></script>
```
to:
```html
  <script type="module" src="main.js"></script>
```

- [ ] **Step 5: Manual end-to-end verification (real token)**

1. Ensure `.env` has a real `SHOPIFY_ADMIN_TOKEN`.
2. Run `cd fstore-ops && npm start`, open http://localhost:3000.
3. **Productos tab**: 13 products load with prices; type a cost (e.g. 6.5) into one → margin/profit fill in and persist on reload. AliExpress + Shopify links open.
4. **Órdenes tab**: summary bar shows (0 orders now → all zeros). When a real order exists, a card appears; clicking a state button highlights it and persists on reload; "Mostradas" updates with filters.
5. Confirm `fstore-ops/data.json` now contains your edits.

- [ ] **Step 6: Commit**

```bash
git add fstore-ops/public/index.html fstore-ops/public/styles.css fstore-ops/public/main.js
git commit -m "feat(ops): two-tab dashboard front end"
```

---

## Self-Review

**Spec coverage:** Pricing view (Task 7 Productos + Task 5 GET products) ✓; order followup with states/tracking/notes/history (Tasks 3, 5, 7) ✓; AliExpress source links pre-seeded (Task 1) and per-item "Pedir" button (Task 7) ✓; total-profit summary incl. month + filter-aware "Mostradas" (Task 5 summary + Task 7 renderOrders) ✓; profit = sell − cost, no shipping (Task 2) ✓; live Shopify via server-held token (Tasks 4, 6) ✓; atomic data.json + seed (Task 3) ✓; error banner (Task 5 502 + Task 7 showBanner) ✓; setup README (Task 6) ✓.

**Type consistency:** `createStore`, `createShopifyClient`, `createApp` signatures match across tasks; order object fields (`state, tracking, notes, history, expectedProfit, incomplete`) consistent between Task 5 output and Task 7 render; `productId`/`cost` keys align between store, compute, and app.

**Line-item source links:** resolved — Task 5's `GET /api/orders` now enriches each line item with `sourceUrl: overlay.products[li.productId]?.sourceUrl || ''`, which Task 7's `orderHtml` reads for the "Pedir en AliExpress" button.
</content>
</invoke>
