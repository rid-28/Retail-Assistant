import { NextResponse } from "next/server";
import { capturePayment } from "@/lib/agents/workers/payment";

export async function POST(req: Request) {
  let body: { paymentId?: string } | null = null;
  try {
    body = (await req.json()) as { paymentId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
  const capture = capturePayment(body.paymentId);
  return NextResponse.json({ capture }, { status: 200 });
}



