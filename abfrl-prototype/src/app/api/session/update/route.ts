import { NextResponse } from "next/server";
import type { Channel } from "@/lib/types";
import { getOrCreateSession, saveSession } from "@/lib/sessionStore";

export async function POST(req: Request) {
  let body: { sessionId: string; channel?: Channel; customerId?: string; storeId?: string } | null = null;
  try {
    body = (await req.json()) as { sessionId: string; channel?: Channel; customerId?: string; storeId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const s = getOrCreateSession({
    sessionId: body.sessionId,
    channel: body.channel ?? "web",
    customerId: body.customerId,
    storeId: body.storeId,
  });
  saveSession(s);
  return NextResponse.json({ session: s }, { status: 200 });
}



