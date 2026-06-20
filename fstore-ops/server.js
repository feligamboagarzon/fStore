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
