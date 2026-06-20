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
