"use client";

import * as React from "react";
import type { AgentMessageResponse, Channel, CustomerProfile, OrchestrationLog, SessionState, StoreLocation } from "@/lib/types";
import { Button, Card, CardBody, CardHeader, Input, Pill, Select, cx } from "@/components/ui";
import { FlowViz } from "@/components/FlowViz";
import { inr, cartSubtotal } from "@/lib/utils";
import { CATALOG } from "@/lib/mock/catalog";
import { ProductCard } from "@/components/ProductCard";

type CustomersPayload = { customers: CustomerProfile[] };
type StoresPayload = { stores: StoreLocation[] };

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

const CHANNELS: Array<{ key: Channel; label: string }> = [
  { key: "mobile", label: "Mobile App" },
  { key: "web", label: "Web Chat" },
  { key: "kiosk", label: "In‑store Kiosk" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "voice", label: "Voice" },
];

export default function Home() {
  const [channel, setChannel] = React.useState<Channel>("mobile");
  const [customers, setCustomers] = React.useState<CustomerProfile[]>([]);
  const [stores, setStores] = React.useState<StoreLocation[]>([]);

  const [session, setSession] = React.useState<SessionState | null>(null);
  const [lastLogs, setLastLogs] = React.useState<OrchestrationLog[]>([]);
  const [selectedLogId, setSelectedLogId] = React.useState<string | null>(null);

  const [message, setMessage] = React.useState("");
  const [joinCode, setJoinCode] = React.useState("");

  const [forcePaymentDecline, setForcePaymentDecline] = React.useState(false);
  const [forceOutOfStockSku, setForceOutOfStockSku] = React.useState<string | null>(null);

  const kioskMode = channel === "kiosk";
  const whatsappMode = channel === "whatsapp";
  const voiceMode = channel === "voice";
  const mobileMode = channel === "mobile";
  const webMode = channel === "web";

  React.useEffect(() => {
    document.body.classList.toggle("mode-kiosk", kioskMode);
  }, [kioskMode]);

  React.useEffect(() => {
    const run = async () => {
      const [c, s] = await Promise.all([getJSON<CustomersPayload>("/api/mock/customers"), getJSON<StoresPayload>("/api/mock/stores")]);
      setCustomers(c.customers);
      setStores(s.stores);
    };
    run().catch(() => {});
  }, []);

  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("abfrl_sessionId") : null;
    if (!stored) return;
    getJSON<{ session: SessionState }>(`/api/session/${stored}`)
      .then((d) => setSession(d.session))
      .catch(() => {});
  }, []);

  const ensureSession = React.useCallback(async () => {
    if (session?.sessionId) return session.sessionId;
    const res = await postJSON<AgentMessageResponse>("/api/agent/message", { channel, message: "hi" });
    setSession(res.session);
    setLastLogs(res.logs);
    window.localStorage.setItem("abfrl_sessionId", res.session.sessionId);
    return res.session.sessionId;
  }, [session, channel]);

  const updateContext = React.useCallback(
    async (patch: { customerId?: string; storeId?: string; channel?: Channel }) => {
      const sessionId = await ensureSession();
      const res = await postJSON<{ session: SessionState }>("/api/session/update", {
        sessionId,
        channel: patch.channel ?? channel,
        customerId: patch.customerId ?? session?.customerId,
        storeId: patch.storeId ?? session?.storeId,
      });
      setSession(res.session);
    },
    [ensureSession, channel, session?.customerId, session?.storeId]
  );

  const send = React.useCallback(async () => {
    const text = message.trim();
    if (!text) return;
    const sessionId = await ensureSession();
    setMessage("");
    const res = await postJSON<AgentMessageResponse>("/api/agent/message", {
      sessionId,
      channel,
      message: text,
      customerId: session?.customerId,
      storeId: session?.storeId,
      flags: { forcePaymentDecline, forceOutOfStockSku },
    });
    setSession(res.session);
    setLastLogs(res.logs);
  }, [message, ensureSession, channel, session?.customerId, session?.storeId, forcePaymentDecline, forceOutOfStockSku]);

  const quickSend = React.useCallback(
    async (text: string) => {
      const sessionId = await ensureSession();
      const res = await postJSON<AgentMessageResponse>("/api/agent/message", {
        sessionId,
        channel,
        message: text,
        customerId: session?.customerId,
        storeId: session?.storeId,
        flags: { forcePaymentDecline, forceOutOfStockSku },
      });
      setSession(res.session);
      setLastLogs(res.logs);
    },
    [ensureSession, channel, session?.customerId, session?.storeId, forcePaymentDecline, forceOutOfStockSku]
  );

  const join = React.useCallback(async () => {
    const code = joinCode.trim();
    if (!code) return;
    const res = await getJSON<{ session: SessionState }>(`/api/session/${encodeURIComponent(code)}`);
    setSession(res.session);
    window.localStorage.setItem("abfrl_sessionId", res.session.sessionId);
    setJoinCode("");
  }, [joinCode]);

  const currentCustomer = customers.find((c) => c.id === session?.customerId);
  const currentStore = stores.find((s) => s.id === session?.storeId);
  const recos = React.useMemo(() => {
    const skus = session?.lastRecommendations ?? [];
    return skus.map((sku) => CATALOG.find((p) => p.sku === sku)).filter(Boolean);
  }, [session?.lastRecommendations]);
  const subtotal = session?.cart?.length ? cartSubtotal(session.cart) : 0;

  const header = (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="text-lg font-semibold tracking-tight">ABFRL – Conversational Sales Agent (Prototype)</div>
        <div className="text-sm text-[var(--muted)]">
          Omnichannel continuity • Worker-agent orchestration • Mock retail APIs • AOV-focused guidance
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="info">Theme: Teal/Charcoal</Pill>
        {session?.sessionId ? <Pill tone="ok">Session: {session.sessionId}</Pill> : <Pill tone="warn">No session yet</Pill>}
      </div>
    </div>
  );

  const channelBanner = (
    <div
      className={cx(
        "mt-3 rounded-xl border border-[var(--border)] px-3 py-2 text-sm",
        whatsappMode ? "bg-emerald-500/10" : kioskMode ? "bg-cyan-500/10" : voiceMode ? "bg-amber-500/10" : "bg-white/5"
      )}
    >
      {kioskMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="info">Kiosk Mode</Pill>
          <div className="text-[var(--muted)]">
            Fast in-store flow: <span className="text-[var(--fg)]">scan SKU</span> • <span className="text-[var(--fg)]">reserve try‑on</span> •{" "}
            <span className="text-[var(--fg)]">pay at POS</span>
          </div>
        </div>
      ) : whatsappMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="ok">WhatsApp Mode</Pill>
          <div className="text-[var(--muted)]">
            Short replies + numbered options. Try: <span className="text-[var(--fg)]">“women dress under 5k in black”</span>
          </div>
        </div>
      ) : voiceMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="warn">Voice Mode</Pill>
          <div className="text-[var(--muted)]">
            Concise responses, one question at a time. Try: <span className="text-[var(--fg)]">“recommend office shoes under 4k”</span>
          </div>
        </div>
      ) : mobileMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="info">Mobile App Mode</Pill>
          <div className="text-[var(--muted)]">Compact chat + tap-to-add recommendations.</div>
        </div>
      ) : webMode ? (
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="info">Web Chat Mode</Pill>
          <div className="text-[var(--muted)]">Widget-style assistant + detailed logs for supervisors.</div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-[1400px] px-4 py-4">
        <Card className="mb-4">
          <CardHeader>
            {header}
            {channelBanner}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="text-xs font-medium text-[var(--muted)]">Channel</div>
              {CHANNELS.map((c) => (
                <Button
                  key={c.key}
                  variant={channel === c.key ? "primary" : "ghost"}
                  className="h-9"
                  onClick={async () => {
                    setChannel(c.key);
                    await updateContext({ channel: c.key });
                  }}
                >
                  {c.label}
                </Button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <Input
                  placeholder="Join with session code…"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="h-9 w-[220px]"
                />
                <Button variant="ghost" className="h-9" onClick={join}>
                  Join
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className={cx("grid grid-cols-1 gap-4 lg:grid-cols-12", kioskMode && "lg:grid-cols-12")}>
          {/* Left: Context */}
          <Card className={cx("lg:col-span-3", mobileMode && "lg:col-span-3")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="font-semibold">Context</div>
                <Pill tone="info">{channel}</Pill>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <div>
                <div className="mb-1 text-xs font-medium text-[var(--muted)]">Synthetic Customer Profile</div>
                <Select
                  value={session?.customerId ?? ""}
                  onChange={async (e) => {
                    const id = e.target.value || undefined;
                    await updateContext({ customerId: id });
                    // Nudge agent once profile is set
                    setMessage("Recommend something for office under 3k");
                  }}
                >
                  <option value="">Select a customer…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.city} • {c.loyaltyTier}
                    </option>
                  ))}
                </Select>
                {currentCustomer ? (
                  <div className="mt-2 text-xs text-[var(--muted)]">
                    Style tags: <span className="text-[var(--fg)]">{currentCustomer.styleTags.join(", ")}</span>
                    <br />
                    Sizes:{" "}
                    <span className="text-[var(--fg)]">
                      top {currentCustomer.sizes.top ?? "—"}, bottom {currentCustomer.sizes.bottom ?? "—"}, shoe{" "}
                      {currentCustomer.sizes.shoe ?? "—"}
                    </span>
                  </div>
                ) : null}
              </div>

              <div>
                <div className="mb-1 text-xs font-medium text-[var(--muted)]">Store / Location Context</div>
                <Select
                  value={session?.storeId ?? ""}
                  onChange={(e) => updateContext({ storeId: e.target.value || undefined })}
                >
                  <option value="">Auto (from customer)</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.city} • {s.name}
                    </option>
                  ))}
                </Select>
                {currentStore ? <div className="mt-2 text-xs text-[var(--muted)]">Active: {currentStore.name}</div> : null}
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <div className="mb-2 text-xs font-semibold">Edge-case Toggles</div>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>Force payment decline</span>
                  <input
                    type="checkbox"
                    checked={forcePaymentDecline}
                    onChange={(e) => setForcePaymentDecline(e.target.checked)}
                  />
                </label>
                <div className="mt-2 text-xs text-[var(--muted)]">
                  Tip: after getting recommendations, copy one SKU here to simulate out-of-stock.
                </div>
                <Input
                  className="mt-2"
                  placeholder="Force OOS SKU (e.g., M-SHIRT-OXF-001)"
                  value={forceOutOfStockSku ?? ""}
                  onChange={(e) => setForceOutOfStockSku(e.target.value.trim() ? e.target.value.trim() : null)}
                />
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <div className="mb-2 text-xs font-semibold">Demo Shortcuts</div>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="ghost" onClick={() => setMessage("Need a party outfit under 5k")}>
                    Party outfit under 5k
                  </Button>
                  <Button variant="ghost" onClick={() => setMessage("Add 1 to cart")}>
                    Add 1 to cart
                  </Button>
                  <Button variant="ghost" onClick={() => setMessage("checkout pay with UPI")}>
                    Checkout (UPI)
                  </Button>
                  <Button variant="ghost" onClick={() => setMessage("offers")}>
                    View offers
                  </Button>
                  {kioskMode ? (
                    <Button variant="ghost" onClick={() => setMessage("scan M-SHIRT-OXF-001")}>
                      Kiosk: scan sample SKU
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => setMessage("track my order")}>
                    Post‑purchase: tracking
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Center: Chat */}
          <Card
            className={cx(
              "lg:col-span-6",
              mobileMode && "lg:col-span-6",
              whatsappMode && "lg:col-span-6",
              voiceMode && "lg:col-span-6"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="font-semibold">
                  {whatsappMode ? "WhatsApp Chat" : voiceMode ? "Voice Transcript" : kioskMode ? "Kiosk Assistant" : mobileMode ? "Mobile Chat" : "Web Chat"}
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={session?.status === "paid" ? "ok" : session?.status === "checkout" ? "warn" : "info"}>
                    {session?.status ?? "—"}
                  </Pill>
                </div>
              </div>
            </CardHeader>
            <CardBody className={cx("flex h-[680px] flex-col gap-3", kioskMode && "h-[740px]", voiceMode && "h-[600px]")}>
              <div
                className={cx(
                  "flex-1 overflow-auto rounded-xl border border-[var(--border)] p-3",
                  whatsappMode ? "bg-[#0b141a] bg-[radial-gradient(circle_at_20%_20%,rgba(34,197,94,0.08),transparent_35%),radial-gradient(circle_at_80%_50%,rgba(20,184,166,0.06),transparent_40%)]" : "bg-[var(--panel-2)]",
                  mobileMode && "max-w-[520px] mx-auto",
                  voiceMode && "bg-black/20"
                )}
              >
                {session?.conversation?.length ? (
                  <div className="space-y-3">
                    {session.conversation.map((m, idx) => (
                      <div key={idx} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                        <div
                          className={cx(
                            "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                            m.role === "user"
                              ? whatsappMode
                                ? "bg-[#005c4b] text-white"
                                : voiceMode
                                  ? "bg-amber-400/20 text-amber-100 border border-amber-400/25"
                                  : "bg-[var(--primary)] text-black"
                              : m.role === "system"
                                ? "bg-white/5 text-[var(--muted)] border border-[var(--border)]"
                                : whatsappMode
                                  ? "bg-[#202c33] text-[#e9edef] border border-white/10"
                                  : voiceMode
                                    ? "bg-white/5 text-[var(--fg)] border border-[var(--border)]"
                                    : "bg-white/10 text-[var(--fg)] border border-[var(--border)]"
                          )}
                        >
                          <div className="mb-1 text-[10px] opacity-70">
                            {m.role.toUpperCase()} • {m.channel}
                          </div>
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--muted)]">
                    Start by selecting a customer profile on the left, then ask for recommendations.
                  </div>
                )}
              </div>

              <div className={cx("flex items-center gap-2", mobileMode && "max-w-[520px] mx-auto")}>
                <Input
                  placeholder={
                    kioskMode
                      ? "Kiosk input… (e.g., “scan M-SHIRT-OXF-001”, “reserve try-on”, “pay at POS”)"
                      : whatsappMode
                        ? "WhatsApp message… (e.g., “women blazer black under 5k”)"
                        : voiceMode
                          ? "Voice transcript… (e.g., “recommend office outfit under 3k”)"
                          : mobileMode
                            ? "Mobile chat… (e.g., “men shirt under 2k in blue”)"
                            : "Web chat… (e.g., “recommend party outfit under 5k”)"
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send().catch(() => {});
                  }}
                />
                {voiceMode ? (
                  <Button onClick={() => send().catch(() => {})} className="h-10">
                    Speak
                  </Button>
                ) : (
                  <Button onClick={() => send().catch(() => {})} className="h-10">
                    Send
                  </Button>
                )}
              </div>
              <div className={cx("text-xs text-[var(--muted)]", mobileMode && "max-w-[520px] mx-auto")}>
                Omnichannel continuity demo: switch channel buttons above — conversation + cart persist via the same **Session** code.
              </div>
            </CardBody>
          </Card>

          {/* Right: Cart + Orchestration */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="font-semibold">Cart & Orchestration</div>
                <Pill tone="info">{session?.cart?.length ? `${session.cart.length} items` : "empty"}</Pill>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <div className="mb-2 text-xs font-semibold">Cart</div>
                {session?.cart?.length ? (
                  <div className="space-y-2">
                    {session.cart.map((l) => (
                      <div key={l.sku} className="flex items-center justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{l.name}</div>
                          <div className="text-xs text-[var(--muted)]">
                            {l.sku} • qty {l.qty}
                          </div>
                        </div>
                        <div className="shrink-0 font-semibold">{inr(l.price * l.qty)}</div>
                      </div>
                    ))}
                    <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2 text-sm">
                      <div className="text-[var(--muted)]">Subtotal</div>
                      <div className="font-semibold">{inr(subtotal)}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button variant="ghost" onClick={() => quickSend("reserve try-on")} className="h-9">
                        Reserve Try‑On
                      </Button>
                      <Button onClick={() => quickSend("checkout pay with UPI")} className="h-9">
                        Checkout
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-[var(--muted)]">No items yet. Say “add 1 to cart” after recommendations.</div>
                )}
              </div>

              {recos.length ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
                  <div className="mb-2 text-xs font-semibold">Recommendations (click to add)</div>
                  <div className="space-y-3">
                    {recos.slice(0, 3).map((p) => (
                      <ProductCard
                        key={p!.sku}
                        product={p!}
                        onAdd={() => quickSend(`add ${p!.sku} to cart`)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <div className="mb-2 text-xs font-semibold">Orchestration Flow (last run)</div>
                <FlowViz logs={lastLogs} />
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-2)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-semibold">Logs (last run)</div>
                  <Pill tone={lastLogs.some((l) => l.status === "error") ? "err" : lastLogs.some((l) => l.status === "warn") ? "warn" : "ok"}>
                    {lastLogs.length} steps
                  </Pill>
                </div>
                {lastLogs.length ? (
                  <div className="space-y-2">
                    <div className="max-h-[200px] overflow-auto space-y-2 text-xs">
                      {lastLogs.map((l) => (
                        <button
                          key={l.id}
                          onClick={() => setSelectedLogId((cur) => (cur === l.id ? null : l.id))}
                          className={cx(
                            "w-full text-left rounded-lg border p-2 transition",
                            selectedLogId === l.id ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)] bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-semibold">{l.agent}</div>
                            <Pill tone={l.status === "ok" ? "ok" : l.status === "warn" ? "warn" : "err"}>{l.status}</Pill>
                          </div>
                          <div className="text-[var(--muted)]">{l.action}</div>
                        </button>
                      ))}
                    </div>
                    {selectedLogId ? (
                      <div className="rounded-lg border border-[var(--border)] bg-black/30 p-2 text-xs">
                        {(() => {
                          const l = lastLogs.find((x) => x.id === selectedLogId);
                          if (!l) return null;
                          const detail = {
                            agent: l.agent,
                            action: l.action,
                            status: l.status,
                            input: l.input ?? null,
                            output: l.output ?? null,
                          };
                          return (
                            <pre className="max-h-[160px] overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--fg)]">
                              {JSON.stringify(detail, null, 2)}
                            </pre>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-sm text-[var(--muted)]">Send a message to see the worker-agent orchestration steps.</div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="mt-4 text-xs text-[var(--muted)]">
          Tech mapping (per prompt image): Frontend (Next.js/React) • AI Orchestrate (LangChain/LangGraph-ready stubs; session manager) •
          Backend & Integration (API gateway-style routes; WhatsApp/Payments/POS simulated) • Data & Storage (mock catalog/customers/inventory/offers).
        </div>
      </div>
    </div>
  );
}
