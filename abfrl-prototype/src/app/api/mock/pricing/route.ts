import { NextResponse } from "next/server";
import type { CartLine } from "@/lib/types";
import { findCustomer } from "@/lib/mock/customers";
import { priceCart } from "@/lib/mock/offers";

export async function POST(req: Request) {
  let body: { customerId?: string; cart?: CartLine[]; couponCode?: string | null } | null = null;
  try {
    body = (await req.json()) as { customerId?: string; cart?: CartLine[]; couponCode?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const cart = body?.cart ?? [];
  const customer = body?.customerId ? findCustomer(body.customerId) : undefined;
  const pricing = priceCart({ customer, cart, couponCode: body?.couponCode ?? null });
  return NextResponse.json({ pricing }, { status: 200 });
}



