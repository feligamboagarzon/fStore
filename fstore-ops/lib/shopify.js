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
