import type {
  AgentMessageRequest,
  AgentMessageResponse,
  Channel,
  Product,
} from "@/lib/types";
import { findCustomer } from "@/lib/mock/customers";
import { CATALOG, findProductBySku } from "@/lib/mock/catalog";
import { STORES } from "@/lib/mock/stores";
import { getOrCreateSession, logEvent, saveSession } from "@/lib/sessionStore";
import { inr, uuid } from "@/lib/utils";
import { recommendProducts, crossSellFor } from "@/lib/agents/workers/recommendation";
import { checkInventory } from "@/lib/agents/workers/inventory";
import { applyLoyaltyAndOffers } from "@/lib/agents/workers/loyaltyOffers";
import { authorizePayment, capturePayment, type PaymentMethod } from "@/lib/agents/workers/payment";
import { planFulfillment } from "@/lib/agents/workers/fulfillment";
import { handlePostPurchase } from "@/lib/agents/workers/postPurchase";
import { parseNLU } from "@/lib/agents/nlu";

function detectPaymentMethod(msg: string, channel: Channel): PaymentMethod {
  const low = msg.toLowerCase();
  if (low.includes("upi")) return "upi";
  if (low.includes("gift")) return "gift_card";
  if (low.includes("card") || low.includes("saved")) return "saved_card";
  if (channel === "kiosk") return "pos";
  return "upi";
}

function findByNameFragment(fragment: string): Product | undefined {
  const f = fragment.trim().toLowerCase();
  if (!f) return undefined;
  return CATALOG.find((p) => p.name.toLowerCase().includes(f) || p.subcategory.toLowerCase().includes(f));
}

function formatAvailability(inv: ReturnType<typeof checkInventory>[number]): string {
  const o = inv.bestOption;
  if (o.mode === "reserve") return "In stock at your store (reserve for try‑on)";
  if (o.mode === "collect") return "Available at another store (click & collect)";
  if (o.mode === "ship") return "Available online (ship to home)";
  return "Currently out of stock";
}

function adaptText(channel: Channel, text: string): string {
  // Keep WhatsApp messages shorter and more “chatty”
  if (channel === "whatsapp") {
    return text
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\*\*/g, "")
      .replace(/•/g, "-")
      .replace(/Say “/g, "Reply: ");
  }
  // Kiosk: remove extra fluff
  if (channel === "kiosk") {
    // Avoid dotAll flag for older TS targets
    return text
      .replace(/To complete the look[\s\S]*?\n\n/, "")
      .replace(/\*\*/g, "")
      .replace(/Out-of-stock recovery:[\s\S]*?Say “alternatives.*?”\./, "");
  }
  // Voice: concise, one question at a time, no markdown
  if (channel === "voice") {
    return text
      .replace(/\*\*/g, "")
      .replace(/\n{2,}/g, "\n")
      .split("\n")
      .slice(0, 6)
      .join("\n");
  }
  return text;
}

function findInStockAlternatives(params: {
  base: Product;
  preferredStoreId?: string;
  forceOutOfStockSku?: string | null;
  limit?: number;
}): Product[] {
  const limit = params.limit ?? 2;
  const pool = CATALOG.filter(
    (p) =>
      p.sku !== params.base.sku &&
      p.category === params.base.category &&
      (p.subcategory === params.base.subcategory || p.tags.some((t) => params.base.tags.includes(t)))
  );
  const inv = checkInventory({
    products: pool.slice(0, 12),
    preferredStoreId: params.preferredStoreId,
    forceOutOfStockSku: params.forceOutOfStockSku ?? null,
  });
  const ok = pool
    .slice(0, 12)
    .filter((p) => inv.find((x) => x.sku === p.sku)?.bestOption.mode !== "oos")
    .slice(0, limit);
  return ok;
}

export async function runSalesAgent(req: AgentMessageRequest): Promise<AgentMessageResponse> {
  const logs: AgentMessageResponse["logs"] = [];

  const session = getOrCreateSession({
    sessionId: req.sessionId,
    channel: req.channel,
    customerId: req.customerId,
    storeId: req.storeId,
  });

  logEvent(logs, {
    agent: "SessionManager",
    action: "getOrCreateSession",
    input: { sessionId: req.sessionId, channel: req.channel, customerId: req.customerId, storeId: req.storeId },
    output: { sessionId: session.sessionId },
    status: "ok",
  });

  // Attach/resolve customer & store context
  const customer = session.customerId ? findCustomer(session.customerId) : undefined;
  const storeId = session.storeId ?? customer?.preferredStoreId;
  if (storeId) session.storeId = storeId;

  const lastMsg = session.conversation[session.conversation.length - 1];
  if (lastMsg && lastMsg.channel !== req.channel) {
    logEvent(logs, {
      agent: "SalesAgent",
      action: "channelSwitch",
      input: { from: lastMsg.channel, to: req.channel },
      status: "ok",
    });
    session.conversation.push({
      role: "system",
      text: `Channel switch detected: ${lastMsg.channel} → ${req.channel}. Continuing the same session, cart and preferences.`,
      ts: Date.now(),
      channel: req.channel,
    });
    const cartSummary = session.cart.length
      ? `Cart: ${session.cart.map((l) => `${l.name} x${l.qty}`).join(", ")}.`
      : "Cart is empty.";
    session.conversation.push({
      role: "agent",
      text: adaptText(
        req.channel,
        `Welcome on ${req.channel}. I’ve kept your context.\n${cartSummary}\nTell me what you want to do next: recommendations, reserve try‑on, or checkout.`
      ),
      ts: Date.now(),
      channel: req.channel,
    });
  }

  const nlu = parseNLU({ channel: req.channel, message: req.message });
  logEvent(logs, { agent: "SalesAgent", action: "nlu.parse", input: { message: req.message }, output: nlu, status: "ok" });

  // Update preferences from NLU
  if (typeof nlu.budgetMax === "number") session.preferences.budgetMax = nlu.budgetMax;
  if (nlu.occasion) session.preferences.occasion = nlu.occasion;
  if (customer && !session.preferences.sizes) session.preferences.sizes = customer.sizes;
  if (customer && (!session.preferences.styleTags || session.preferences.styleTags.length === 0)) {
    session.preferences.styleTags = customer.styleTags;
  }

  session.conversation.push({ role: "user", text: req.message, ts: Date.now(), channel: req.channel });

  const low = req.message.toLowerCase();
  const wantsRecommend = nlu.intent.recommend;
  const wantsAlternatives = nlu.intent.recommend && (low.includes("alternative") || low.includes("similar"));
  const wantsAdd = nlu.intent.add;
  const wantsCheckout = nlu.intent.checkout;
  const wantsReserve = nlu.intent.reserve;
  const wantsScan = nlu.intent.scan;
  const wantsTrack = nlu.intent.track;
  const wantsReturn = nlu.intent.returns;
  const wantsFeedback = nlu.intent.feedback;
  const wantsOffers = nlu.intent.offers;
  const wantsHelp = nlu.intent.help;
  const wantsViewCart = nlu.intent.viewCart;
  const wantsClearCart = nlu.intent.clearCart;
  const wantsRemove = nlu.intent.remove;

  // If user hasn't selected a customer, prompt only on true greetings (avoid hijacking short commands like "add 1").
  const trimmed = low.trim();
  const isGreeting =
    trimmed === "hi" ||
    trimmed === "hello" ||
    trimmed === "hey" ||
    trimmed.startsWith("hi ") ||
    trimmed.startsWith("hello ") ||
    trimmed.startsWith("hey ");
  if (!session.customerId && isGreeting && session.conversation.length <= 2) {
    const reply =
      "Hi! I can help you shop across web/mobile/kiosk/WhatsApp with the same cart and preferences.\n\nStart by picking a customer profile (top-left), or tell me:\n- What occasion are you shopping for?\n- Any budget or preferred styles?";
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  if (wantsHelp) {
    const replyRaw =
      `I can help you shop end‑to‑end with the same session across channels.\n\nTry:\n` +
      `- “recommend office outfit under 3k in blue”\n` +
      `- “show women blazers in black under 5k”\n` +
      `- “add 1” / “remove 1” / “show cart”\n` +
      `- “reserve try‑on” (kiosk) or “scan <SKU>”\n` +
      `- “checkout pay with UPI” (toggle payment decline to demo recovery)\n` +
      `- “track my order” / “return” / “feedback”`;
    const reply = adaptText(req.channel, replyRaw);
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  if (wantsViewCart) {
    const replyRaw = session.cart.length
      ? `Here’s your cart:\n${session.cart.map((l, i) => `${i + 1}. ${l.name} x${l.qty} — ${inr(l.price * l.qty)} (${l.sku})`).join("\n")}`
      : `Your cart is empty. Ask for recommendations to start.`;
    const reply = adaptText(req.channel, replyRaw);
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  if (wantsClearCart) {
    session.cart = [];
    session.status = "browsing";
    const reply = adaptText(req.channel, "Cleared your cart. Want fresh recommendations? Tell me occasion + budget.");
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  if (wantsRemove) {
    const num = req.message.match(/\b([1-9])\b/);
    if (num && session.cart.length) {
      const idx = Number(num[1]) - 1;
      const line = session.cart[idx];
      if (line) {
        session.cart.splice(idx, 1);
        const reply = adaptText(req.channel, `Removed ${line.name} from cart. Say “checkout” when ready.`);
        session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
        saveSession(session);
        return { session, reply, logs };
      }
    }
  }

  if (wantsOffers) {
    const pricing = applyLoyaltyAndOffers({ customer, cart: session.cart });
    const replyRaw =
      `Current offers for you:\n` +
      (customer ? `- Loyalty tier: ${customer.loyaltyTier}\n` : "") +
      (pricing.applied.length ? pricing.applied.map((a) => `- ${a}`).join("\n") + "\n" : "") +
      `Tip: Coupon examples: WELCOME200 (₹1999+), ABFRL10 (10% off).\n` +
      (session.cart.length ? `Current cart total (est.): ${inr(pricing.total)}` : `Add something to cart to see savings.`);
    const reply = adaptText(req.channel, replyRaw);
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  if (wantsTrack || wantsReturn || wantsFeedback) {
    logEvent(logs, {
      agent: "PostPurchaseSupportAgent",
      action: "handleRequest",
      input: { intent: wantsTrack ? "track" : wantsReturn ? "return" : "feedback", orderId: session.lastOrderId },
      status: "ok",
    });
    const res = handlePostPurchase({
      intent: wantsTrack ? "track" : wantsReturn ? "return" : "feedback",
      orderId: session.lastOrderId,
    });
    const reply =
      res.kind === "tracking"
        ? `Tracking update: **${res.status}** (Tracking ID: ${res.trackingId}).`
        : res.kind === "return"
          ? `Done. ${res.instructions} (RMA: ${res.rmaId})`
          : res.prompt;
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  // Explicit SKU
  const skuMatch = req.message.match(/[A-Z]-[A-Z]{2,6}-[A-Z0-9]{2,10}-\d{3}/);
  let target: Product | undefined = skuMatch ? findProductBySku(skuMatch[0]) : undefined;

  // Simulated in-store POS barcode scan
  if (req.channel === "kiosk" && wantsScan && skuMatch) {
    target = findProductBySku(skuMatch[0]);
    if (target) {
      logEvent(logs, { agent: "POSIntegration", action: "barcodeScan", input: { sku: target.sku }, status: "ok" });
    }
  }
  if (!target && wantsAdd) {
    // Try number-based selection from last recommendations: "add 1" or "add 2"
    const num = req.message.match(/\b([1-4])\b/);
    if (num && session.lastRecommendations?.length) {
      const idx = Number(num[1]) - 1;
      const sku = session.lastRecommendations[idx];
      if (sku) target = findProductBySku(sku);
    }
  }
  if (!target && wantsAdd) {
    // Fallback: try name fragment after "add"
    const frag = req.message.split("add").slice(1).join("add");
    target = findByNameFragment(frag);
  }

  if (wantsAlternatives) {
    const m = req.message.match(/[A-Z]-[A-Z]{2,6}-[A-Z0-9]{2,10}-\d{3}/);
    const base = m ? findProductBySku(m[0]) : undefined;
    if (base) {
      logEvent(logs, { agent: "RecommendationAgent", action: "alternatives", input: { sku: base.sku }, status: "ok" });
      const alts = findInStockAlternatives({
        base,
        preferredStoreId: storeId,
        forceOutOfStockSku: req.flags?.forceOutOfStockSku ?? null,
        limit: 4,
      });
      const replyRaw =
        alts.length
          ? `Here are in-stock alternatives close to **${base.name}**:\n\n${alts
              .map((p, i) => `${i + 1}. **${p.name}** — ${inr(p.price)} (SKU: ${p.sku})`)
              .join("\n")}\n\nSay “add 1” to add one.`
          : `I couldn’t find close in-stock alternatives right now. Want me to broaden the search (different style/price)?`;
      const reply = adaptText(req.channel, replyRaw);
      session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
      saveSession(session);
      return { session, reply, logs };
    }
  }

  if (wantsReserve) {
    // Reserve in-store for try-on without paying (booking use-case)
    const pickSku = (session.cart[0]?.sku ?? session.lastRecommendations?.[0]) || null;
    const pick = pickSku ? findProductBySku(pickSku) : undefined;

    logEvent(logs, {
      agent: "FulfillmentAgent",
      action: "reserveTryOn.request",
      input: { sku: pick?.sku ?? null, storeId, channel: req.channel },
      status: "ok",
    });

    if (!pick) {
      const replyRaw = `Sure — what would you like to try on? Ask for recommendations first, then say “reserve try‑on”.`;
      const reply = adaptText(req.channel, replyRaw);
      session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
      saveSession(session);
      return { session, reply, logs };
    }

    const inv = checkInventory({
      products: [pick],
      preferredStoreId: storeId,
      forceOutOfStockSku: req.flags?.forceOutOfStockSku ?? null,
    })[0];

    if (inv.bestOption.mode === "oos") {
      logEvent(logs, { agent: "InventoryAgent", action: "reserveTryOn.oos", input: { sku: pick.sku }, status: "warn" });
      const alts = findInStockAlternatives({
        base: pick,
        preferredStoreId: storeId,
        forceOutOfStockSku: req.flags?.forceOutOfStockSku ?? null,
        limit: 3,
      });
      const replyRaw =
        `I can’t reserve **${pick.name}** right now — it’s out of stock.\n\n` +
        (alts.length
          ? `In‑stock alternatives you can try on today:\n${alts
              .map((p, i) => `${i + 1}. ${p.name} — ${inr(p.price)} (SKU: ${p.sku})`)
              .join("\n")}\n\nSay “add 1” then “reserve try‑on”.`
          : `Want me to broaden the options?`);
      const reply = adaptText(req.channel, replyRaw);
      session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
      saveSession(session);
      return { session, reply, logs };
    }

    const plan = planFulfillment({ channel: "kiosk", storeId, wantsReserve: true });
    logEvent(logs, { agent: "FulfillmentAgent", action: "reserveTryOn.plan", output: plan, status: "ok" });
    const storeName = storeId ? (STORES.find((s) => s.id === storeId)?.name ?? storeId) : "your store";
    const replyRaw =
      `Reserved **${pick.name}** for try‑on at **${storeName}**.\n\n` +
      (plan.mode === "reserve_try_on"
        ? `Slot: **${plan.slot}**\nReservation: **${plan.reservationId}**\n\nAt the kiosk, you can also scan a barcode (e.g. “scan ${pick.sku}”) to add items fast.`
        : "reservationId" in plan
          ? `Reservation: **${plan.reservationId}**`
          : `Reservation: **—**`);
    const reply = adaptText(req.channel, replyRaw);
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  if (target && wantsAdd) {
    const inv = checkInventory({ products: [target], preferredStoreId: storeId, forceOutOfStockSku: req.flags?.forceOutOfStockSku ?? null })[0];
    logEvent(logs, { agent: "InventoryAgent", action: "checkInventory.forAdd", input: { sku: target.sku, storeId }, output: inv, status: "ok" });
    if (inv.bestOption.mode === "oos") {
      const alts = findInStockAlternatives({ base: target, preferredStoreId: storeId, forceOutOfStockSku: req.flags?.forceOutOfStockSku ?? null });
      const reply =
        `That item is currently out of stock across online + stores.\n\n` +
        (alts.length
          ? `Closest alternatives in stock:\n${alts.map((p, i) => `${i + 1}. ${p.name} — ${inr(p.price)} (SKU: ${p.sku})`).join("\n")}\n\nSay “add 1” to add an alternative.`
          : `Want me to recommend similar in-stock options?`);
      session.conversation.push({ role: "agent", text: adaptText(req.channel, reply), ts: Date.now(), channel: req.channel });
      saveSession(session);
      return { session, reply: adaptText(req.channel, reply), logs };
    }

    logEvent(logs, { agent: "SalesAgent", action: "addToCart", input: { sku: target.sku }, status: "ok" });
    const existing = session.cart.find((l) => l.sku === target!.sku);
    if (existing) existing.qty += 1;
    else session.cart.push({ sku: target.sku, name: target.name, price: target.price, qty: 1, imageUrl: target.imageUrl });

    const cross = crossSellFor(target.sku);
    logEvent(logs, { agent: "RecommendationAgent", action: "crossSell", input: { sku: target.sku }, output: cross.map((p) => p.sku), status: "ok" });

    const replyRaw =
      `Added **${target.name}** to your cart.\n\nTo complete the look (and boost value), would you like one of these:\n` +
      cross
        .map((p, i) => `${i + 1}. ${p.name} — ${inr(p.price)} (SKU: ${p.sku})`)
        .join("\n") +
      `\n\nWhen you're ready, say **checkout**.`;
    const reply = adaptText(req.channel, replyRaw);
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  if (wantsCheckout) {
    session.status = "checkout";

    // Inventory-aware checkout
    const cartProducts = session.cart.map((l) => findProductBySku(l.sku)).filter(Boolean) as Product[];
    const inv = checkInventory({ products: cartProducts, preferredStoreId: storeId, forceOutOfStockSku: req.flags?.forceOutOfStockSku ?? null });
    const oos = cartProducts.filter((p) => inv.find((x) => x.sku === p.sku)?.bestOption.mode === "oos");
    if (oos.length) {
      logEvent(logs, { agent: "InventoryAgent", action: "checkout.oos", input: { skus: oos.map((p) => p.sku) }, status: "warn" });
      const alt = findInStockAlternatives({ base: oos[0], preferredStoreId: storeId, forceOutOfStockSku: req.flags?.forceOutOfStockSku ?? null, limit: 3 });
      const replyRaw =
        `Before checkout: **${oos[0].name}** is out of stock across online + stores.\n\n` +
        (alt.length
          ? `Here are in-stock alternatives:\n${alt.map((p, i) => `${i + 1}. ${p.name} — ${inr(p.price)} (SKU: ${p.sku})`).join("\n")}\n\nSay “add 1” to add an alternative, then checkout again.`
          : `Want me to recommend similar items in stock?`);
      const reply = adaptText(req.channel, replyRaw);
      session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
      saveSession(session);
      return { session, reply, logs };
    }

    logEvent(logs, { agent: "LoyaltyOffersAgent", action: "priceCart", input: { cartLines: session.cart.length }, status: "ok" });
    const pricing = applyLoyaltyAndOffers({ customer: customer, cart: session.cart });
    logEvent(logs, { agent: "LoyaltyOffersAgent", action: "priceCart.result", output: pricing, status: "ok" });

    const method = detectPaymentMethod(req.message, req.channel);
    logEvent(logs, { agent: "PaymentAgent", action: "authorize", input: { amount: pricing.total, method }, status: "ok" });
    const auth = authorizePayment({ amount: pricing.total, method, forceDecline: req.flags?.forcePaymentDecline });
    logEvent(logs, { agent: "PaymentAgent", action: "authorize.result", output: auth, status: auth.authorized ? "ok" : "warn" });

    if (!auth.authorized) {
      const replyRaw =
        `I couldn't complete the payment: **${auth.reason}**\n\nWant to retry with another method?\n- Say **pay with UPI**\n- Or **pay with card**\n- Or (in-store) **pay at POS**`;
      const reply = adaptText(req.channel, replyRaw);
      session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
      saveSession(session);
      return { session, reply, logs };
    }

    const cap = capturePayment(auth.paymentId);
    logEvent(logs, { agent: "PaymentAgent", action: "capture.result", output: cap, status: cap.captured ? "ok" : "error" });

    const plan = planFulfillment({ channel: req.channel, storeId: storeId });
    logEvent(logs, { agent: "FulfillmentAgent", action: "plan", input: { channel: req.channel, storeId }, output: plan, status: "ok" });

    session.status = "paid";
    session.lastOrderId = `ord_${uuid()}`;

    const planText =
      plan.mode === "ship_to_home"
        ? `Shipping confirmed. ETA: ${plan.etaDays} days (Tracking: ${plan.trackingId}).`
        : plan.mode === "click_collect"
          ? `Click & Collect reserved at ${plan.storeId}. Pickup window: ${plan.pickupWindow} (Reservation: ${plan.reservationId}).`
          : `Try-on reserved at ${plan.storeId}. Slot: ${plan.slot} (Reservation: ${plan.reservationId}).`;

    const replyRaw =
      `Payment successful. Order **${session.lastOrderId}** is confirmed.\n\n` +
      `Summary:\n- Subtotal: ${inr(pricing.subtotal)}\n- Discounts: -${inr(pricing.discount)}\n- Shipping: ${pricing.shipping ? inr(pricing.shipping) : "Free"}\n- **Total: ${inr(pricing.total)}**\n` +
      (pricing.applied.length ? `\nApplied:\n${pricing.applied.map((a) => `- ${a}`).join("\n")}\n` : "\n") +
      `\n${planText}\n\nAfter delivery/pickup, I can help with **tracking**, **returns/exchanges**, or **feedback**.`;

    const reply = adaptText(req.channel, replyRaw);
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  if (wantsRecommend || session.lastRecommendations?.length === 0 || low.includes("browse")) {
    const hintCategory = nlu.categoryHint ?? null;
    logEvent(logs, {
      agent: "RecommendationAgent",
      action: "recommendProducts",
      input: {
        hintCategory,
        preferences: session.preferences,
        customerId: session.customerId,
        productTypeHint: nlu.productTypeHint,
        colorHint: nlu.color,
        queryText: nlu.freeText,
      },
      status: "ok",
    });
    const picks = recommendProducts({
      customer,
      preferences: session.preferences,
      hintCategory,
      limit: 4,
      queryText: nlu.freeText,
      colorHint: nlu.color,
      productTypeHint: nlu.productTypeHint,
    });

    if (!picks.length) {
      const replyRaw =
        `I couldn’t find a match for that request in this demo catalog.\n\nTry one of these:\n` +
        `- “men shirt under 2k”\n- “women dress for party under 5k”\n- “sneakers under 4k”\n- “bag for work under 3k”`;
      const reply = adaptText(req.channel, replyRaw);
      session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
      saveSession(session);
      return { session, reply, logs };
    }

    const inv = checkInventory({ products: picks, preferredStoreId: storeId, forceOutOfStockSku: req.flags?.forceOutOfStockSku ?? null });
    logEvent(logs, { agent: "InventoryAgent", action: "checkInventory", input: { storeId }, output: inv, status: "ok" });

    session.lastRecommendations = picks.map((p) => p.sku);

    const storeName = storeId ? (STORES.find((s) => s.id === storeId)?.name ?? storeId) : "your nearest store";
    const header =
      `Based on your style` +
      (session.preferences.occasion ? ` for **${session.preferences.occasion}**` : "") +
      (session.preferences.budgetMax ? ` under **${inr(session.preferences.budgetMax)}**` : "") +
      (nlu.color ? ` in **${nlu.color}**` : "") +
      `, here are 4 strong picks:`;

    const list = picks
      .map((p, i) => {
        const a = inv.find((x) => x.sku === p.sku)!;
        return `${i + 1}. **${p.name}** — ${inr(p.price)}\n   - ${formatAvailability(a)}\n   - SKU: ${p.sku}`;
      })
      .join("\n");

    const oos = picks.filter((p) => inv.find((x) => x.sku === p.sku)?.bestOption.mode === "oos");
    const recovery =
      oos.length > 0
        ? `\n\nOut-of-stock recovery: I see **${oos[0].name}** is OOS. I can instantly propose an in-stock alternative or switch to ship/click&collect.\nSay “alternatives for ${oos[0].sku}”.`
        : "";

    const nudge =
      `\n\nTell me which one you like (say **add 1** / **add 2**) and I’ll suggest a matching add-on to increase outfit value. ` +
      `If you're near **${storeName}**, I can also **reserve for try‑on**.`;

    const replyRaw = `${header}\n\n${list}${recovery}${nudge}`;
    const reply = adaptText(req.channel, replyRaw);
    session.conversation.push({ role: "agent", text: reply, ts: Date.now(), channel: req.channel });
    saveSession(session);
    return { session, reply, logs };
  }

  // Default: consultative follow-up
  const reply =
    `Got it. Quick check so I can personalize:\n` +
    `1) What occasion is this for (office / party / everyday / wedding)?\n` +
    `2) Any budget cap (e.g., “under 3k”)?\n` +
    `3) Prefer something more classic or trend-forward?`;
  session.conversation.push({ role: "agent", text: adaptText(req.channel, reply), ts: Date.now(), channel: req.channel });
  saveSession(session);
  return { session, reply: adaptText(req.channel, reply), logs };
}


