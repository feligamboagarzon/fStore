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
