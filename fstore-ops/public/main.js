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
