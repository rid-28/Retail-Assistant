import { NextResponse } from "next/server";
import { findProductBySku } from "@/lib/mock/catalog";

export async function POST(req: Request) {
  let body: { sku?: string } | null = null;
  try {
    body = (await req.json()) as { sku?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sku = (body?.sku ?? "").trim();
  if (!sku) return NextResponse.json({ error: "Missing sku" }, { status: 400 });

  const product = findProductBySku(sku);
  if (!product) return NextResponse.json({ ok: false, error: "Unknown SKU" }, { status: 404 });

  return NextResponse.json(
    {
      ok: true,
      sku: product.sku,
      name: product.name,
      price: product.price,
      note: "Simulated POS scan successful.",
    },
    { status: 200 }
  );
}



