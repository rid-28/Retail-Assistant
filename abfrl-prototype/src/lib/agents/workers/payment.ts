import { uuid } from "@/lib/utils";

export type PaymentMethod = "saved_card" | "upi" | "gift_card" | "pos";

export type PaymentAuth = {
  paymentId: string;
  authorized: boolean;
  reason?: string;
  method: PaymentMethod;
};

export type PaymentCapture = {
  paymentId: string;
  captured: boolean;
  reason?: string;
};

export function authorizePayment(params: {
  amount: number;
  method: PaymentMethod;
  forceDecline?: boolean;
}): PaymentAuth {
  const paymentId = `pay_${uuid()}`;
  if (params.amount <= 0) return { paymentId, authorized: false, reason: "Invalid amount", method: params.method };

  const randomDecline = Math.random() < 0.2;
  const decline = Boolean(params.forceDecline) || randomDecline;
  if (decline) {
    return {
      paymentId,
      authorized: false,
      reason: "Transaction declined (insufficient funds / risk check).",
      method: params.method,
    };
  }

  return { paymentId, authorized: true, method: params.method };
}

export function capturePayment(paymentId: string): PaymentCapture {
  // Prototype: capture always succeeds if reached
  return { paymentId, captured: true };
}



