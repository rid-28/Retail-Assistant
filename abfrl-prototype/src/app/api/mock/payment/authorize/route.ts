import { NextResponse } from "next/server";
import { authorizePayment } from "@/lib/agents/workers/payment";

export async function POST(req: Request) {
  let body: { amount?: number; method?: "saved_card" | "upi" | "gift_card" | "pos"; forceDecline?: boolean } | null = null;
  try {
    body = (await req.json()) as {
      amount?: number;
      method?: "saved_card" | "upi" | "gift_card" | "pos";
      forceDecline?: boolean;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body?.amount !== "number" || !body?.method) {
    return NextResponse.json({ error: "Missing fields: amount, method" }, { status: 400 });
  }

  const auth = authorizePayment({ amount: body.amount, method: body.method, forceDecline: body.forceDecline });
  return NextResponse.json({ auth }, { status: 200 });
}



