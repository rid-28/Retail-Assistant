import type { Channel, OrchestrationLog, SessionState } from "@/lib/types";
import { now, uuid } from "@/lib/utils";

type Store = Map<string, SessionState>;

function getGlobalStore(): Store {
  const g = globalThis as unknown as { __abfrlSessions?: Store };
  if (!g.__abfrlSessions) g.__abfrlSessions = new Map();
  return g.__abfrlSessions;
}

export function createSession(params: {
  sessionId?: string;
  channel: Channel;
  customerId?: string;
  storeId?: string;
}): SessionState {
  const t = now();
  return {
    sessionId: params.sessionId ?? uuid(),
    channel: params.channel,
    createdAt: t,
    updatedAt: t,
    customerId: params.customerId,
    storeId: params.storeId,
    preferences: {},
    cart: [],
    conversation: [
      {
        role: "system",
        text:
          "Session initialized. Maintain continuity across channels (web/mobile/kiosk/WhatsApp/voice).",
        ts: t,
        channel: params.channel,
      },
    ],
    status: "browsing",
  };
}

export function getOrCreateSession(params: {
  sessionId?: string;
  channel: Channel;
  customerId?: string;
  storeId?: string;
}): SessionState {
  const store = getGlobalStore();
  if (params.sessionId && store.has(params.sessionId)) {
    const s = store.get(params.sessionId)!;
    s.channel = params.channel;
    if (params.customerId) s.customerId = params.customerId;
    if (params.storeId) s.storeId = params.storeId;
    s.updatedAt = now();
    store.set(s.sessionId, s);
    return s;
  }
  const created = createSession(params);
  store.set(created.sessionId, created);
  return created;
}

export function saveSession(session: SessionState): void {
  session.updatedAt = now();
  getGlobalStore().set(session.sessionId, session);
}

export function loadSession(sessionId: string): SessionState | null {
  return getGlobalStore().get(sessionId) ?? null;
}

export function listSessions(): SessionState[] {
  return Array.from(getGlobalStore().values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function logEvent(
  logs: OrchestrationLog[],
  evt: Omit<OrchestrationLog, "id" | "ts">
): OrchestrationLog {
  const entry: OrchestrationLog = { ...evt, id: uuid(), ts: now() };
  logs.push(entry);
  return entry;
}



