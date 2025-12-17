import { uuid } from "@/lib/utils";

export type SupportResponse =
  | { kind: "tracking"; trackingId: string; status: string }
  | { kind: "return"; rmaId: string; instructions: string }
  | { kind: "feedback"; prompt: string };

export function handlePostPurchase(params: { intent: "track" | "return" | "feedback"; orderId?: string }): SupportResponse {
  if (params.intent === "track") {
    return {
      kind: "tracking",
      trackingId: `trk_${uuid()}`,
      status: "In transit – arriving in 2–3 days",
    };
  }
  if (params.intent === "return") {
    return {
      kind: "return",
      rmaId: `rma_${uuid()}`,
      instructions:
        "Return/exchange initiated. Pack the item with tags intact; pickup will be scheduled within 24 hours (or you can drop at the nearest store).",
    };
  }
  return {
    kind: "feedback",
    prompt: "Quick one: how was the fit and overall shopping experience (1–5)?",
  };
}



