import { NextResponse } from "next/server";
import { CUSTOMERS } from "@/lib/mock/customers";

export async function GET() {
  return NextResponse.json({ customers: CUSTOMERS }, { status: 200 });
}



