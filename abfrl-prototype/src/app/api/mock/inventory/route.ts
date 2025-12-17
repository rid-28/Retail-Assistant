import { NextResponse } from "next/server";
import { ONLINE_WAREHOUSE_ID, getStock } from "@/lib/mock/inventory";
import { STORES } from "@/lib/mock/stores";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sku = (url.searchParams.get("sku") ?? "").trim();
  const locationId = (url.searchParams.get("locationId") ?? "").trim();

  if (!sku) {
    return NextResponse.json(
      { error: "Missing query param: sku (e.g., /api/mock/inventory?sku=M-SHIRT-OXF-001)" },
      { status: 400 }
    );
  }

  if (locationId) {
    return NextResponse.json(
      { sku, locationId, qty: getStock(sku, locationId) },
      { status: 200 }
    );
  }

  const perLocation: Record<string, number> = {
    [ONLINE_WAREHOUSE_ID]: getStock(sku, ONLINE_WAREHOUSE_ID),
  };
  for (const s of STORES) perLocation[s.id] = getStock(sku, s.id);

  return NextResponse.json({ sku, perLocation }, { status: 200 });
}



