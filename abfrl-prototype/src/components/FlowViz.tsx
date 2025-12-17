"use client";

import * as React from "react";
import type { OrchestrationLog } from "@/lib/types";
import { cx } from "@/components/ui";

const FLOW: Array<{ key: OrchestrationLog["agent"]; label: string }> = [
  { key: "SalesAgent", label: "Sales Agent" },
  { key: "POSIntegration", label: "POS / Scan" },
  { key: "RecommendationAgent", label: "Recommendation" },
  { key: "InventoryAgent", label: "Inventory" },
  { key: "LoyaltyOffersAgent", label: "Offers/Loyalty" },
  { key: "PaymentAgent", label: "Payment" },
  { key: "FulfillmentAgent", label: "Fulfillment" },
  { key: "PostPurchaseSupportAgent", label: "Post‑Purchase" },
];

export function FlowViz(props: { logs: OrchestrationLog[] }) {
  const active = React.useMemo(() => new Set(props.logs.map((l) => l.agent)), [props.logs]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {FLOW.map((n, idx) => {
        const isActive = active.has(n.key);
        return (
          <React.Fragment key={n.key}>
            <div
              className={cx(
                "rounded-xl border px-3 py-2 text-sm",
                isActive ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)] bg-white/5"
              )}
              title={n.key}
            >
              {n.label}
            </div>
            {idx < FLOW.length - 1 ? <div className="text-[var(--muted)]">→</div> : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}



