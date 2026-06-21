import express from 'express';
import { productProfit, orderExpectedProfit, isInCurrentMonth, round2 } from './lib/compute.js';

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
      res.json({ orders: rows, summary: { total: round2(total), month: round2(month), count: rows.length } });
    } catch (e) {
      res.status(502).json({ error: e.message });
    }
  });

  app.post('/api/products/:id', async (req, res) => {
    try {
      const patch = {};
      if (req.body.cost !== undefined) patch.cost = req.body.cost === '' || req.body.cost === null ? null : Number(req.body.cost);
      if (req.body.sourceUrl !== undefined) patch.sourceUrl = req.body.sourceUrl;
      if (req.body.notes !== undefined) patch.notes = req.body.notes;
      res.json(await store.upsertProduct(req.params.id, patch));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/orders/:id', async (req, res) => {
    try {
      const allowed = ['nueva', 'pedida', 'enviada', 'entregada', 'problema'];
      const patch = {};
      if (req.body.state !== undefined) {
        if (!allowed.includes(req.body.state)) return res.status(400).json({ error: 'invalid state' });
        patch.state = req.body.state;
      }
      if (req.body.tracking !== undefined) patch.tracking = req.body.tracking;
      if (req.body.notes !== undefined) patch.notes = req.body.notes;
      res.json(await store.upsertOrder(req.params.id, patch));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.use(express.static(publicDir));
  return app;
}
