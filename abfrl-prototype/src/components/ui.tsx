"use client";

import * as React from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card(props: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow)]",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

export function CardHeader(props: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cx("px-4 py-3 border-b border-[var(--border)]", props.className)}>{props.children}</div>;
}

export function CardBody(props: React.PropsWithChildren<{ className?: string }>) {
  return <div className={cx("px-4 py-3", props.className)}>{props.children}</div>;
}

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }
) {
  const v = props.variant ?? "primary";
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 font-medium transition outline-none focus:outline-none focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    v === "primary"
      ? "bg-[var(--primary)] text-black hover:brightness-110"
      : v === "danger"
        ? "bg-[var(--danger)] text-white hover:brightness-110"
        : "bg-transparent text-[var(--fg)] hover:bg-white/5 border border-[var(--border)]";
  return <button {...props} className={cx(base, styles, props.className)} />;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-[var(--fg)] placeholder:text-[var(--muted)] outline-none focus-visible:ring-[var(--ring)]",
        props.className
      )}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cx(
        "w-full rounded-xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-[var(--fg)] outline-none focus-visible:ring-[var(--ring)]",
        props.className
      )}
    />
  );
}

export function Pill(props: React.PropsWithChildren<{ tone?: "info" | "ok" | "warn" | "err"; className?: string }>) {
  const tone = props.tone ?? "info";
  const cls =
    tone === "ok"
      ? "bg-emerald-400/15 text-emerald-200 border-emerald-400/25"
      : tone === "warn"
        ? "bg-amber-400/15 text-amber-200 border-amber-400/25"
        : tone === "err"
          ? "bg-red-400/15 text-red-200 border-red-400/25"
          : "bg-cyan-400/10 text-cyan-200 border-cyan-400/20";
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", cls, props.className)}>
      {props.children}
    </span>
  );
}



