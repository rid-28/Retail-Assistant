import { NextResponse } from "next/server";
import type { CartLine } from "@/lib/types";
import { uuid } from "@/lib/utils";

export async function POST(req: Request) {
  let body: { customerId?: string; storeId?: string; cart?: CartLine[] } | null = null;
  try {
    body = (await req.json()) as { customerId?: string; storeId?: string; cart?: CartLine[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const cart = body?.cart ?? [];
  if (!cart.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  const orderId = `ord_${uuid()}`;
  return NextResponse.json({ orderId, note: "Simulated order creation (mock OMS)." }, { status: 200 });
}



