export type Channel = "web" | "mobile" | "kiosk" | "whatsapp" | "voice";

export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export type CustomerProfile = {
  id: string;
  name: string;
  age: number;
  city: string;
  preferredStoreId: string;
  loyaltyTier: LoyaltyTier;
  devicePreferences: Channel[];
  purchaseHistory: Array<{
    sku: string;
    name: string;
    category: string;
    price: number;
    purchasedAt: string; // ISO
  }>;
  styleTags: string[];
  sizes: { top?: string; bottom?: string; shoe?: string };
};

export type Product = {
  sku: string;
  name: string;
  brand: string;
  category: "Men" | "Women" | "Kids" | "Accessories" | "Footwear";
  subcategory: string;
  tags: string[];
  color: string;
  price: number;
  imageUrl: string;
};

export type StoreLocation = {
  id: string;
  name: string;
  city: string;
};

export type CartLine = {
  sku: string;
  name: string;
  price: number;
  qty: number;
  imageUrl: string;
};

export type Preferences = {
  occasion?: string;
  budgetMax?: number;
  styleTags?: string[];
  sizes?: { top?: string; bottom?: string; shoe?: string };
};

export type OrchestrationLog = {
  id: string;
  ts: number;
  agent:
    | "SalesAgent"
    | "POSIntegration"
    | "RecommendationAgent"
    | "InventoryAgent"
    | "LoyaltyOffersAgent"
    | "PaymentAgent"
    | "FulfillmentAgent"
    | "PostPurchaseSupportAgent"
    | "SessionManager";
  action: string;
  input?: unknown;
  output?: unknown;
  status: "ok" | "warn" | "error";
};

export type SessionState = {
  sessionId: string;
  channel: Channel;
  createdAt: number;
  updatedAt: number;

  customerId?: string;
  storeId?: string;

  preferences: Preferences;
  cart: CartLine[];
  conversation: Array<{
    role: "user" | "agent" | "system";
    text: string;
    ts: number;
    channel: Channel;
  }>;

  lastRecommendations?: string[];
  lastOrderId?: string;
  status: "browsing" | "checkout" | "paid" | "fulfilled";
};

export type AgentMessageRequest = {
  sessionId?: string;
  channel: Channel;
  message: string;
  customerId?: string;
  storeId?: string;
  flags?: {
    forcePaymentDecline?: boolean;
    forceOutOfStockSku?: string | null;
  };
};

export type AgentMessageResponse = {
  session: SessionState;
  reply: string;
  logs: OrchestrationLog[];
};


