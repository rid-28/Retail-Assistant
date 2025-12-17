import type { Product } from "@/lib/types";
import { ONLINE_WAREHOUSE_ID, getStock } from "@/lib/mock/inventory";
import { STORES } from "@/lib/mock/stores";

export type InventoryResult = {
  sku: string;
  onlineQty: number;
  storeQty: Record<string, number>;
  bestOption:
    | { mode: "ship"; locationId: typeof ONLINE_WAREHOUSE_ID; qty: number }
    | { mode: "collect" | "reserve"; locationId: string; qty: number }
    | { mode: "oos"; locationId: string | typeof ONLINE_WAREHOUSE_ID; qty: 0 };
};

export function checkInventory(params: {
  products: Product[];
  preferredStoreId?: string;
  forceOutOfStockSku?: string | null;
}): InventoryResult[] {
  return params.products.map((p) => {
    const onlineQty = params.forceOutOfStockSku === p.sku ? 0 : getStock(p.sku, ONLINE_WAREHOUSE_ID);
    const storeQty: Record<string, number> = {};
    for (const s of STORES) {
      storeQty[s.id] = params.forceOutOfStockSku === p.sku ? 0 : getStock(p.sku, s.id);
    }

    const preferred = params.preferredStoreId;
    const prefQty = preferred ? storeQty[preferred] ?? 0 : 0;

    let best: InventoryResult["bestOption"];
    if (prefQty > 0) best = { mode: "reserve", locationId: preferred!, qty: prefQty };
    else if (onlineQty > 0) best = { mode: "ship", locationId: ONLINE_WAREHOUSE_ID, qty: onlineQty };
    else {
      const anyStore = Object.entries(storeQty).find(([, q]) => q > 0);
      if (anyStore) best = { mode: "collect", locationId: anyStore[0], qty: anyStore[1] };
      else best = { mode: "oos", locationId: preferred ?? ONLINE_WAREHOUSE_ID, qty: 0 };
    }

    return { sku: p.sku, onlineQty, storeQty, bestOption: best };
  });
}



