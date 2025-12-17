import { NextResponse } from "next/server";
import type { AgentMessageRequest } from "@/lib/types";
import { runSalesAgent } from "@/lib/agents/salesAgent";

export async function POST(req: Request) {
  let body: AgentMessageRequest | null = null;
  try {
    body = (await req.json()) as AgentMessageRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || !body.channel || typeof body.message !== "string") {
    return NextResponse.json({ error: "Missing fields: channel, message" }, { status: 400 });
  }

  const res = await runSalesAgent(body);
  return NextResponse.json(res, { status: 200 });
}



