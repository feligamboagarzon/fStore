export const round2 = (n) => Math.round(n * 100) / 100;

export function productProfit(price, cost) {
  if (cost == null || Number.isNaN(Number(cost))) {
    return { profit: null, marginPct: null };
  }
  const profit = round2(price - Number(cost));
  const marginPct = price > 0 ? Math.round((profit / price) * 100) : null;
  return { profit, marginPct };
}

export function orderExpectedProfit(lineItems, costByProductId) {
  let expectedProfit = 0;
  let incomplete = false;
  for (const li of lineItems) {
    const cost = li.productId != null ? costByProductId[li.productId] : null;
    if (cost == null || Number.isNaN(Number(cost))) {
      incomplete = true;
      continue;
    }
    expectedProfit += li.quantity * (li.sellPrice - Number(cost));
  }
  return { expectedProfit: round2(expectedProfit), incomplete };
}

export function isInCurrentMonth(iso, now) {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
