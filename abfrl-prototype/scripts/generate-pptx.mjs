import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";

const outDir = path.join(process.cwd(), "deliverables");
const outFile = path.join(outDir, "ABFRL_Agentic_Conversational_Sales_Prototype.pptx");

fs.mkdirSync(outDir, { recursive: true });

const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "ABFRL Prototype (Auto-generated)";

const COLORS = {
  bg: "0B1220",
  panel: "0F1A2F",
  border: "22304D",
  fg: "E6EDF6",
  muted: "9FB0C3",
  primary: "14B8A6",
  green: "22C55E",
  warn: "F59E0B",
  danger: "EF4444",
};

function slideTitle(slide, title, subtitle) {
  slide.background = { color: COLORS.bg };
  slide.addText(title, {
    x: 0.6,
    y: 0.4,
    w: 12.2,
    h: 0.8,
    fontFace: "Calibri",
    fontSize: 34,
    color: COLORS.fg,
    bold: true,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 1.15,
      w: 12.2,
      h: 0.5,
      fontFace: "Calibri",
      fontSize: 16,
      color: COLORS.muted,
    });
  }
}

function panel(slide, { x, y, w, h, title, lines }) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h,
    fill: { color: COLORS.panel },
    line: { color: COLORS.border, width: 1 },
    radius: 10,
  });
  slide.addText(title, {
    x: x + 0.25,
    y: y + 0.15,
    w: w - 0.5,
    h: 0.35,
    fontFace: "Calibri",
    fontSize: 16,
    bold: true,
    color: COLORS.fg,
  });
  slide.addText(lines.join("\n"), {
    x: x + 0.25,
    y: y + 0.55,
    w: w - 0.5,
    h: h - 0.7,
    fontFace: "Calibri",
    fontSize: 12,
    color: COLORS.muted,
    valign: "top",
  });
}

function pill(slide, { x, y, text, color }) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w: text.length * 0.12 + 1.1,
    h: 0.35,
    fill: { color },
    line: { color, width: 1 },
    radius: 18,
  });
  slide.addText(text, {
    x: x + 0.2,
    y: y + 0.06,
    w: text.length * 0.12 + 0.9,
    h: 0.25,
    fontFace: "Calibri",
    fontSize: 12,
    bold: true,
    color: "000000",
  });
}

// Slide 1: Title + Problem + Goal
{
  const s = pptx.addSlide();
  slideTitle(
    s,
    "ABFRL – Agentic Conversational Sales Agent (Prototype)",
    "Unified omnichannel shopping across web, mobile, WhatsApp/Telegram, kiosk and voice • AOV + conversion uplift"
  );

  panel(s, {
    x: 0.6,
    y: 2.0,
    w: 6.3,
    h: 4.9,
    title: "Problem",
    lines: [
      "Fragmented journeys across channels → loss of context and drop-offs.",
      "Limited sales associate bandwidth → missed upsell / cross-sell.",
      "Need a human-like, consultative agent that guides to purchase.",
      "",
      "Outcome targets:",
      "- Increase Average Order Value (AOV)",
      "- Improve conversion rate",
      "- Seamless online ↔ store handoff",
    ],
  });

  panel(s, {
    x: 7.1,
    y: 2.0,
    w: 5.7,
    h: 4.9,
    title: "Solution (What this prototype demonstrates)",
    lines: [
      "Central Sales Agent orchestrating modular Worker Agents:",
      "- Recommendation (bundles + upsell/cross-sell)",
      "- Inventory (ship / collect / reserve)",
      "- Loyalty & Offers (pricing + savings)",
      "- Payment (UPI/card/POS + failure recovery)",
      "- Fulfillment (ship / click & collect / try-on booking)",
      "- Post-purchase (tracking/returns/feedback)",
      "",
      "Observability: step-by-step orchestration logs + flow view.",
    ],
  });

  pill(s, { x: 0.6, y: 1.62, text: "Theme: Teal/Charcoal (non-purple)", color: COLORS.primary });
}

// Slide 2: Omnichannel Journey + Session continuity
{
  const s = pptx.addSlide();
  slideTitle(s, "Omnichannel Continuity (One session across channels)", "Conversation, cart and preferences persist via a Session Code");

  // Journey boxes
  const y = 2.2;
  const boxW = 3.95;
  const boxH = 3.2;
  const xs = [0.6, 4.7, 8.85];
  const labels = ["Mobile App", "WhatsApp/Telegram", "In-store Kiosk"];
  const steps = [
    ["Customer: 'Need office outfit under 3k'", "Agent: asks open questions, recommends 4 items", "Cart + prefs saved"],
    ["Customer continues on chat", "Agent recalls style, store, promotions", "Adds bundle (belt/shoes)"],
    ["Customer scans barcode at kiosk", "Agent reserves try-on slot", "Checkout via POS / UPI"],
  ];

  for (let i = 0; i < 3; i++) {
    panel(s, {
      x: xs[i],
      y,
      w: boxW,
      h: boxH,
      title: labels[i],
      lines: steps[i],
    });
  }

  // Arrows
  s.addShape(pptx.ShapeType.rightArrow, {
    x: 4.25,
    y: 3.2,
    w: 0.5,
    h: 0.6,
    fill: { color: COLORS.primary },
    line: { color: COLORS.primary },
  });
  s.addShape(pptx.ShapeType.rightArrow, {
    x: 8.4,
    y: 3.2,
    w: 0.5,
    h: 0.6,
    fill: { color: COLORS.primary },
    line: { color: COLORS.primary },
  });

  panel(s, {
    x: 0.6,
    y: 5.65,
    w: 12.2,
    h: 1.2,
    title: "Key demo moment",
    lines: [
      "Customer starts on Mobile → switches to Kiosk and the agent continues seamlessly (same cart, same preferences).",
      "Edge-case toggles demonstrate recovery (payment decline / out-of-stock).",
    ],
  });
}

// Slide 3: Agentic Orchestration
{
  const s = pptx.addSlide();
  slideTitle(s, "Agentic Orchestration (Sales Agent + Worker Agents)", "Loosely coupled workers; easy to add new capabilities (e.g., Gift Wrapping Agent)");

  // Hub
  s.addShape(pptx.ShapeType.ellipse, {
    x: 5.3,
    y: 2.2,
    w: 2.7,
    h: 2.7,
    fill: { color: "1B2A44" },
    line: { color: COLORS.primary, width: 2 },
  });
  s.addText("Conversational\nSales Agent", {
    x: 5.3,
    y: 2.55,
    w: 2.7,
    h: 2.2,
    fontFace: "Calibri",
    fontSize: 18,
    bold: true,
    align: "center",
    color: COLORS.fg,
  });

  const workers = [
    ["Recommendation", 1.0, 2.0],
    ["Inventory", 1.2, 4.6],
    ["Loyalty & Offers", 9.7, 2.0],
    ["Payment", 9.5, 4.6],
    ["Fulfillment", 5.2, 0.9],
    ["Post‑Purchase", 5.0, 5.25],
  ];
  for (const [name, x, y] of workers) {
    s.addShape(pptx.ShapeType.roundRect, {
      x,
      y,
      w: 3.2,
      h: 0.7,
      fill: { color: COLORS.panel },
      line: { color: COLORS.border, width: 1 },
      radius: 10,
    });
    s.addText(name, {
      x,
      y: y + 0.14,
      w: 3.2,
      h: 0.4,
      fontFace: "Calibri",
      fontSize: 14,
      bold: true,
      align: "center",
      color: COLORS.fg,
    });
  }

  panel(s, {
    x: 0.6,
    y: 6.0,
    w: 12.2,
    h: 1.0,
    title: "Orchestration visibility",
    lines: ["Each customer message produces a step-by-step trace: agent → worker calls → outputs → recoveries."],
  });
}

// Slide 4: Mock Systems + Data + Tech mapping
{
  const s = pptx.addSlide();
  slideTitle(s, "Mock Systems, Data & Tech Components", "Prototype includes APIs for catalog, inventory, pricing, payments, POS and orders");

  panel(s, {
    x: 0.6,
    y: 2.0,
    w: 6.0,
    h: 2.6,
    title: "Mock Data (Synthetic)",
    lines: [
      "≥ 10 customer profiles (demographics, purchase history, loyalty tier, channel preferences).",
      "Product catalog API (SKUs, category, attributes, price, images).",
      "Multi-location inventory (online warehouse + stores).",
    ],
  });

  panel(s, {
    x: 6.85,
    y: 2.0,
    w: 5.95,
    h: 2.6,
    title: "Mock Services / Integrations",
    lines: [
      "Payments stub (authorize/capture; declined transactions).",
      "Loyalty & promo rules engine (tier discounts + bundles).",
      "POS scan (barcode simulation) + order creation (mock OMS).",
    ],
  });

  panel(s, {
    x: 0.6,
    y: 4.85,
    w: 12.2,
    h: 2.05,
    title: "Tech mapping (from requested architecture)",
    lines: [
      "Frontend: Next.js (React) UI with channel switcher + chat + cart + logs.",
      "AI Orchestrate: modular Sales/Worker Agent design (LangChain/LangGraph-ready).",
      "Backend & Integration: Next.js API routes act like an API Gateway; stubs for WhatsApp/Payment/POS.",
      "Data & Storage: in-memory session store + mock datasets (swap for PostgreSQL/Mongo/Elastic).",
    ],
  });
}

// Slide 5: Edge cases + KPI levers
{
  const s = pptx.addSlide();
  slideTitle(s, "Edge Cases, Recovery & KPI Levers", "Demonstrates how the agent protects conversion while increasing basket size");

  panel(s, {
    x: 0.6,
    y: 2.0,
    w: 6.0,
    h: 2.55,
    title: "Edge-case handling (demo toggles)",
    lines: [
      "Payment failure: decline → suggest alternate method → retry.",
      "Out-of-stock: propose in-stock alternatives + ship/collect/reserve options.",
      "Channel switch: continues the same session without re-asking basics.",
    ],
  });

  panel(s, {
    x: 6.85,
    y: 2.0,
    w: 5.95,
    h: 2.55,
    title: "AOV & conversion tactics",
    lines: [
      "Consultative questions (occasion, budget, style).",
      "Bundles + complementary items (belt/shoes/bag).",
      "Transparent savings (loyalty tier, promos, coupons).",
      "Friction reduction via kiosk scan + click & collect.",
    ],
  });

  panel(s, {
    x: 0.6,
    y: 4.8,
    w: 12.2,
    h: 2.1,
    title: "What to show in the live demo",
    lines: [
      "1) Start on Mobile → get recommendations → add to cart.",
      "2) Switch to Kiosk → reserve try-on or scan barcode → checkout.",
      "3) Trigger payment decline and recover; trigger out-of-stock and recover.",
      "4) Post-purchase: tracking/returns/feedback.",
    ],
  });
}

await pptx.writeFile({ fileName: outFile });
console.log(`PPTX generated: ${outFile}`);



