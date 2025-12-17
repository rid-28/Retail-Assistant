import type { CartLine, CustomerProfile } from "@/lib/types";
import { priceCart } from "@/lib/mock/offers";

export function applyLoyaltyAndOffers(params: {
  customer?: CustomerProfile;
  cart: CartLine[];
  couponCode?: string | null;
}) {
  return priceCart({
    customer: params.customer,
    cart: params.cart,
    couponCode: params.couponCode ?? null,
  });
}



