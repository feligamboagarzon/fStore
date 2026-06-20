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
