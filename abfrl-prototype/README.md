# ABFRL – Agentic Conversational Sales Agent (Working Prototype)

This prototype demonstrates an **AI-driven Conversational Sales Agent** that maintains **omnichannel continuity** across **Mobile, Web, WhatsApp/Telegram, In-store Kiosk, Voice** and orchestrates **Worker Agents** for recommendations, inventory, offers, payment, fulfillment and post-purchase support.

Theme is **teal/charcoal** (non-purple).

## Run the prototype

```bash
cd abfrl-prototype
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo script (what to click / type)

- **Select a customer profile** (left panel).
- Ask: `Recommend something for office under 3k`
- Add: `add 1 to cart` (or click **Add** on the recommendation cards)
- **Switch channel** (top buttons): Mobile → WhatsApp → Kiosk
- On kiosk: try `reserve try-on` or `scan M-SHIRT-OXF-001`
- Checkout: `checkout pay with UPI`
- Toggle **Force payment decline** and retry payment (e.g., `pay with card`)
- Toggle **Force OOS SKU** and retry add/checkout to see recovery
- Post purchase: `track my order` / `return` / `feedback`

## Orchestration visibility

Every message produces a **step-by-step trace** shown in the right panel:
- Worker agent calls
- Inputs/outputs (click a log line to view details)
- Status (`ok/warn/error`)

## Mock APIs (API Gateway-style routes)

- `GET /api/mock/customers`
- `GET /api/mock/stores`
- `GET /api/mock/catalog?q=shirt`
- `GET /api/mock/inventory?sku=M-SHIRT-OXF-001`
- `POST /api/mock/pricing`
- `POST /api/mock/payment/authorize`
- `POST /api/mock/payment/capture`
- `POST /api/mock/pos/scan`
- `POST /api/mock/orders/create`

## PPT Deliverable (5-slide deck)

Generate the PPTX:

```bash
cd abfrl-prototype
npm run pptx
```

Output:
- `abfrl-prototype/deliverables/ABFRL_Agentic_Conversational_Sales_Prototype.pptx`
