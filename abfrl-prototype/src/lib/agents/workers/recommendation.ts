import type { CustomerProfile, Preferences, Product } from "@/lib/types";
import { CATALOG } from "@/lib/mock/catalog";

function scoreProduct(p: Product, prefs: Preferences, customer?: CustomerProfile): number {
  let s = 0;
  const tags = new Set([...(customer?.styleTags ?? []), ...(prefs.styleTags ?? [])]);
  for (const t of p.tags) if (tags.has(t)) s += 3;

  if (prefs.occasion) {
    const o = prefs.occasion.toLowerCase();
    if (o.includes("office") && (p.tags.includes("office") || p.tags.includes("formal"))) s += 4;
    if (o.includes("party") && (p.tags.includes("party") || p.tags.includes("occasion"))) s += 4;
    if (o.includes("wedding") && p.tags.includes("formal")) s += 4;
    if (o.includes("everyday") && (p.tags.includes("everyday") || p.tags.includes("basics"))) s += 3;
  }

  if (typeof prefs.budgetMax === "number") {
    if (p.price <= prefs.budgetMax) s += 2;
    if (p.price <= prefs.budgetMax * 0.75) s += 1;
  }

  // Favor items complementary to purchase history
  const historySkus = new Set(customer?.purchaseHistory.map((h) => h.sku) ?? []);
  if (historySkus.has("M-CHINO-CRM-003") && p.sku.startsWith("M-SHIRT")) s += 3;
  if (historySkus.has("W-DRS-MID-101") && p.sku.startsWith("W-HEEL")) s += 3;

  return s;
}

export function recommendProducts(params: {
  customer?: CustomerProfile;
  preferences: Preferences;
  queryText?: string;
  colorHint?: string;
  productTypeHint?: string | null;
  limit?: number;
  hintCategory?: Product["category"] | null;
}): Product[] {
  const limit = params.limit ?? 4;
  const q = (params.queryText ?? "").trim().toLowerCase();
  const qTokens = q ? q.split(/[^a-z0-9]+/g).filter(Boolean) : [];
  const color = (params.colorHint ?? "").trim().toLowerCase();
  const type = (params.productTypeHint ?? "").trim().toLowerCase();

  const scored = CATALOG
    .filter((p) => (params.hintCategory ? p.category === params.hintCategory : true))
    .filter((p) => {
      // basic product-type filter (if supplied)
      if (type) {
        const hay = `${p.name} ${p.subcategory}`.toLowerCase();
        if (!hay.includes(type)) return false;
      }
      // color hint: soft filter (prefer, don't require) handled by scoring
      return true;
    })
    .map((p) => ({ p, s: scoreProduct(p, params.preferences, params.customer) }))
    .map(({ p, s }) => {
      // Query token scoring
      if (qTokens.length) {
        const hay = `${p.name} ${p.brand} ${p.category} ${p.subcategory} ${p.tags.join(" ")} ${p.color}`.toLowerCase();
        for (const t of qTokens) if (hay.includes(t)) s += 2;
      }
      // Color preference bonus
      if (color) {
        const c = p.color.toLowerCase();
        if (c.includes(color)) s += 4;
      }
      // Budget preference
      if (typeof params.preferences.budgetMax === "number") {
        if (p.price <= params.preferences.budgetMax) s += 2;
        else s -= 2;
      }
      return { p, s };
    })
    .sort((a, b) => b.s - a.s || a.p.price - b.p.price);

  const top = scored.slice(0, limit).map((x) => x.p);
  // If scoring is flat, ensure we still return diverse options
  if (top.length < limit) {
    for (const p of CATALOG) {
      if (top.find((x) => x.sku === p.sku)) continue;
      top.push(p);
      if (top.length >= limit) break;
    }
  }
  return top.slice(0, limit);
}

export function crossSellFor(sku: string): Product[] {
  // Very small, explainable cross-sell map for demo
  if (sku.startsWith("M-SHIRT")) return CATALOG.filter((p) => p.sku.startsWith("A-BELT") || p.sku.startsWith("F-LOF")).slice(0, 2);
  if (sku.startsWith("M-CHINO")) return CATALOG.filter((p) => p.sku.startsWith("M-SHIRT") || p.sku.startsWith("F-LOF")).slice(0, 2);
  if (sku.startsWith("W-DRS")) return CATALOG.filter((p) => p.sku.startsWith("W-HEEL") || p.sku.startsWith("A-BAG")).slice(0, 2);
  if (sku.startsWith("F-SNK")) return CATALOG.filter((p) => p.sku.startsWith("M-TEE") || p.sku.startsWith("A-BAG")).slice(0, 2);
  return CATALOG.filter((p) => p.sku.startsWith("A-BAG") || p.sku.startsWith("A-BELT")).slice(0, 2);
}



