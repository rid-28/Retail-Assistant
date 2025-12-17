import type { CartLine } from "@/lib/types";

export function uuid(): string {
  // Node + modern browsers
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback (good enough for prototype)
  return `sess_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function now(): number {
  return Date.now();
}

export function inr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, l) => sum + l.price * l.qty, 0);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}



