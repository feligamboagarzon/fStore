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
