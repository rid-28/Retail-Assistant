import { NextResponse } from "next/server";
import { CATALOG } from "@/lib/mock/catalog";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const category = (url.searchParams.get("category") ?? "").trim().toLowerCase();

  const products = CATALOG.filter((p) => {
    const matchesQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.subcategory.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q));
    const matchesCat = !category || p.category.toLowerCase() === category;
    return matchesQ && matchesCat;
  });

  return NextResponse.json({ products }, { status: 200 });
}



