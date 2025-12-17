import type { Channel, Product } from "@/lib/types";

export type ParsedNLU = {
  budgetMax?: number;
  occasion?: string;
  color?: string;
  categoryHint?: Product["category"] | null;
  productTypeHint?: string | null; // e.g., "blazer", "kurta"
  intent: {
    recommend: boolean;
    add: boolean;
    remove: boolean;
    viewCart: boolean;
    clearCart: boolean;
    checkout: boolean;
    reserve: boolean;
    scan: boolean;
    track: boolean;
    returns: boolean;
    feedback: boolean;
    offers: boolean;
    help: boolean;
  };
  qty?: number;
  sku?: string | null;
  freeText: string;
};

const COLORS = [
  "black",
  "white",
  "blue",
  "sky",
  "red",
  "green",
  "emerald",
  "olive",
  "beige",
  "tan",
  "grey",
  "gray",
  "indigo",
  "cream",
  "ivory",
  "aqua",
  "charcoal",
] as const;

export function detectBudget(msg: string): number | undefined {
  const m = msg.match(/(?:under|below|max)\s*₹?\s*(\d{3,6})/i);
  if (m) return Number(m[1]);
  const k = msg.match(/₹?\s*(\d{1,3})\s*k\b/i);
  if (k) return Number(k[1]) * 1000;
  const plain = msg.match(/₹\s*(\d{3,6})/i);
  if (plain) return Number(plain[1]);
  return undefined;
}

export function detectOccasion(msg: string): string | undefined {
  const low = msg.toLowerCase();
  const candidates = ["office", "party", "wedding", "date", "everyday", "travel", "festive"];
  for (const c of candidates) if (low.includes(c)) return c === "date" ? "date-night" : c;
  return undefined;
}

export function detectCategoryHint(msg: string): Product["category"] | null {
  const low = msg.toLowerCase();

  if (low.includes("women") || low.includes("girl") || low.includes("ladies")) return "Women";
  if (low.includes("men") || low.includes("guy") || low.includes("male")) return "Men";
  if (low.includes("kid") || low.includes("child") || low.includes("toddler")) return "Kids";
  if (low.includes("shoe") || low.includes("sneaker") || low.includes("loafer") || low.includes("oxford") || low.includes("heels")) return "Footwear";
  if (low.includes("belt") || low.includes("bag") || low.includes("accessor") || low.includes("wallet")) return "Accessories";

  // Clothing types that imply gendered categories
  if (low.includes("dress") || low.includes("saree") || low.includes("kurta") || low.includes("lehenga")) return "Women";
  if (low.includes("shirt") || low.includes("chino") || low.includes("trouser") || low.includes("suit") || low.includes("blazer")) return null;

  return null;
}

export function detectProductType(msg: string): string | null {
  const low = msg.toLowerCase();
  const types = [
    "shirt",
    "t-shirt",
    "tee",
    "chinos",
    "trousers",
    "jeans",
    "jacket",
    "blazer",
    "dress",
    "top",
    "kurta",
    "saree",
    "hoodie",
    "sneakers",
    "loafer",
    "oxford",
    "heels",
    "belt",
    "bag",
  ];
  for (const t of types) if (low.includes(t)) return t;
  return null;
}

export function detectColor(msg: string): string | undefined {
  const low = msg.toLowerCase();
  for (const c of COLORS) {
    if (low.includes(c)) return c;
  }
  return undefined;
}

export function detectSku(msg: string): string | null {
  const m = msg.match(/[A-Z]-[A-Z]{2,6}-[A-Z0-9]{2,10}-\d{3}/);
  return m ? m[0] : null;
}

export function detectQty(msg: string): number | undefined {
  const m = msg.match(/\bqty\s*(\d+)\b/i);
  if (m) return Number(m[1]);
  const m2 = msg.match(/\b(\d+)\s*(?:pcs|pieces|items)\b/i);
  if (m2) return Number(m2[1]);
  return undefined;
}

export function parseNLU(params: { channel: Channel; message: string }): ParsedNLU {
  const message = params.message ?? "";
  const low = message.toLowerCase();

  const intent = {
    recommend:
      low.includes("recommend") ||
      low.includes("suggest") ||
      low.includes("show me") ||
      low.includes("options") ||
      low.includes("looking for") ||
      low.includes("need") ||
      low.includes("browse"),
    add: low.includes("add") || low.includes("cart") || low.includes("take this"),
    remove: low.includes("remove") || low.includes("delete"),
    viewCart: low.includes("view cart") || low.includes("show cart") || low === "cart",
    clearCart: low.includes("clear cart") || low.includes("empty cart"),
    checkout: low.includes("checkout") || low.includes("pay") || low.includes("buy now") || low.includes("place order"),
    reserve: low.includes("reserve") || low.includes("try on") || low.includes("try-on") || low.includes("book slot"),
    scan: low.includes("scan") || low.includes("barcode"),
    track: low.includes("track") || low.includes("where is my order"),
    returns: low.includes("return") || low.includes("exchange"),
    feedback: low.includes("feedback") || low.includes("rate"),
    offers: low.includes("offer") || low.includes("promo") || low.includes("discount") || low.includes("coupon"),
    help: low === "help" || low.includes("what can you do") || low.includes("how does this work"),
  };

  // If the user mentions a product type but didn't say "recommend", treat it as recommend.
  const productTypeHint = detectProductType(message);
  const categoryHint = detectCategoryHint(message);
  const sku = detectSku(message);

  const budgetMax = detectBudget(message);
  const occasion = detectOccasion(message);
  const color = detectColor(message);
  const qty = detectQty(message);

  const recommend = intent.recommend || Boolean(productTypeHint) || Boolean(categoryHint) || Boolean(color) || Boolean(occasion);

  return {
    budgetMax,
    occasion,
    color,
    categoryHint,
    productTypeHint,
    intent: { ...intent, recommend },
    qty,
    sku,
    freeText: message.trim(),
  };
}


