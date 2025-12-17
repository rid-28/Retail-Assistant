import { NextResponse } from "next/server";
import { STORES } from "@/lib/mock/stores";

export async function GET() {
  return NextResponse.json({ stores: STORES }, { status: 200 });
}



