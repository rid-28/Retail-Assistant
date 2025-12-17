import { NextResponse } from "next/server";
import { loadSession } from "@/lib/sessionStore";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await ctx.params;
  const s = loadSession(sessionId);
  if (!s) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json({ session: s }, { status: 200 });
}



