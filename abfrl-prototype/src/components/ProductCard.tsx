"use client";

import * as React from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { Button, cx, Pill } from "@/components/ui";
import { inr } from "@/lib/utils";

export function ProductCard(props: {
  product: Product;
  availabilityHint?: string;
  onAdd?: () => void;
}) {
  const p = props.product;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/5 overflow-hidden">
      <Image
        src={p.imageUrl}
        alt={p.name}
        width={560}
        height={560}
        className="h-36 w-full object-cover"
      />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-semibold">{p.name}</div>
            <div className="text-xs text-[var(--muted)]">
              {p.brand} • {p.category}/{p.subcategory}
            </div>
          </div>
          <div className="shrink-0 font-semibold">{inr(p.price)}</div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Pill tone="info">{p.color}</Pill>
          <Pill tone="info">{p.sku}</Pill>
        </div>
        {props.availabilityHint ? (
          <div className="mt-2 text-xs text-[var(--muted)]">{props.availabilityHint}</div>
        ) : null}
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={props.onAdd} className={cx("h-9", !props.onAdd && "opacity-60")} disabled={!props.onAdd}>
            Add
          </Button>
          <div className="text-xs text-[var(--muted)]">AOV tip: add complementary accessories.</div>
        </div>
      </div>
    </div>
  );
}



