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

function harnessWithFailingStore() {
  const store = {
    getAll: () => ({ products: {}, orders: {} }),
    upsertProduct: async () => { throw new Error('disk full'); },
    upsertOrder: async () => { throw new Error('disk full'); },
  };
  const shopify = {
    fetchProducts: async () => [],
    fetchOrders: async () => [],
  };
  const app = createApp({ store, shopify, publicDir: tmpdir() });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, server };
}

test('POST /api/products/:id returns 500 when store.upsertProduct rejects', async () => {
  const { base, server } = harnessWithFailingStore();
  const res = await fetch(`${base}/api/products/99`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cost: 5 }),
  });
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.ok(body.error, 'response should have an error field');
  server.close();
});

test('POST /api/orders/:id returns 500 when store.upsertOrder rejects', async () => {
  const { base, server } = harnessWithFailingStore();
  const res = await fetch(`${base}/api/orders/O99`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'pedida' }),
  });
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.ok(body.error, 'response should have an error field');
  server.close();
});

test('POST /api/orders/:id still returns 400 for invalid state', async () => {
  const { base, server } = harnessWithFailingStore();
  const res = await fetch(`${base}/api/orders/O99`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'INVALID' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error, 'invalid state');
  server.close();
});
