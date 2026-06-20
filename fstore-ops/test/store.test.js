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
