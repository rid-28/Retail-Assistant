import type { CustomerProfile, CartLine } from "@/lib/types";
import { cartSubtotal, clamp } from "@/lib/utils";

export type PricingResult = {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  applied: string[];
  loyaltyPointsEarned: number;
};

const tierPct: Record<NonNullable<CustomerProfile["loyaltyTier"]>, number> = {
  Bronze: 2,
  Silver: 5,
  Gold: 8,
  Platinum: 12,
};

export function priceCart(params: {
  customer?: CustomerProfile;
  cart: CartLine[];
  couponCode?: string | null;
}): PricingResult {
  const subtotal = cartSubtotal(params.cart);
  const applied: string[] = [];

  let discount = 0;
  const pct = params.customer ? tierPct[params.customer.loyaltyTier] : 0;
  if (pct > 0 && subtotal > 0) {
    const d = Math.round((subtotal * pct) / 100);
    discount += d;
    applied.push(`Loyalty ${params.customer!.loyaltyTier} (${pct}% off)`);
  }

  // Simple promo rules to show cross-sell / bundle psychology
  const has = (prefix: string) => params.cart.some((c) => c.sku.startsWith(prefix));
  const beltLine = params.cart.find((c) => c.sku.startsWith("A-BELT"));
  if ((has("M-SHIRT") && has("M-CHINO")) && beltLine) {
    const d = Math.round(beltLine.price * beltLine.qty * 0.1);
    discount += d;
    applied.push("Bundle: Shirt + Chinos → 10% off belt");
  }

  const heelsLine = params.cart.find((c) => c.sku.startsWith("W-HEEL"));
  if (has("W-DRS") && heelsLine) {
    const d = Math.round(heelsLine.price * heelsLine.qty * 0.05);
    discount += d;
    applied.push("Style Bundle: Dress → 5% off heels");
  }

  // Limited-time promo (synthetic)
  const jacketLines = params.cart.filter((c) => c.sku.startsWith("M-JKT") || c.sku.startsWith("W-BLAZ"));
  if (jacketLines.length > 0) {
    const jacketSum = jacketLines.reduce((s, l) => s + l.price * l.qty, 0);
    const d = Math.round(jacketSum * 0.1);
    discount += d;
    applied.push("Winter Layering Promo: 10% off outerwear");
  }

  // Optional coupon code (kept tiny for demo)
  if (params.couponCode) {
    if (params.couponCode.toUpperCase() === "WELCOME200" && subtotal >= 1999) {
      discount += 200;
      applied.push("Coupon WELCOME200");
    } else if (params.couponCode.toUpperCase() === "ABFRL10") {
      const d = Math.round(subtotal * 0.1);
      discount += d;
      applied.push("Coupon ABFRL10");
    }
  }

  discount = clamp(discount, 0, subtotal);

  const shipping = subtotal - discount >= 2499 ? 0 : subtotal > 0 ? 99 : 0;
  const total = subtotal - discount + shipping;

  // Points: 1 point per ₹100 of net spend (demo)
  const loyaltyPointsEarned = Math.floor((subtotal - discount) / 100);

  return { subtotal, discount, shipping, total, applied, loyaltyPointsEarned };
}



