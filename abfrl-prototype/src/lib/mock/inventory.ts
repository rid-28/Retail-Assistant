import { CATALOG } from "@/lib/mock/catalog";
import { STORES } from "@/lib/mock/stores";

export const ONLINE_WAREHOUSE_ID = "warehouse-online";

type InventoryTable = Record<string, Record<string, number>>;

function hashToInt(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function baseQty(seed: string): number {
  const n = hashToInt(seed) % 11; // 0..10
  if (n <= 1) return 0;
  if (n <= 4) return 2;
  if (n <= 7) return 6;
  return 12;
}

export const INVENTORY: InventoryTable = (() => {
  const table: InventoryTable = {};
  const locations = [ONLINE_WAREHOUSE_ID, ...STORES.map((s) => s.id)];
  for (const p of CATALOG) {
    table[p.sku] = {};
    for (const loc of locations) {
      const q = baseQty(`${p.sku}|${loc}`);
      table[p.sku][loc] = q;
    }
  }
  return table;
})();

export function getStock(sku: string, locationId: string): number {
  return INVENTORY[sku]?.[locationId] ?? 0;
}

export function setStock(sku: string, locationId: string, qty: number): void {
  if (!INVENTORY[sku]) INVENTORY[sku] = {};
  INVENTORY[sku][locationId] = Math.max(0, Math.floor(qty));
}



