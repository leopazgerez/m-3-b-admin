// Pure pieces of the server→client WebSocket (no browser or "@/" imports, so node --test can load them).

export type CloseAction = "none" | "login" | "reconnect";
export interface ServerMessage { type: string; payload: unknown }

/** http(s)://host/…/api → ws(s)://host/…/ws */
export function socketUrl(apiUrl: string): string {
  const u = new URL(apiUrl);
  const scheme = u.protocol === "https:" ? "wss:" : "ws:";
  const path = u.pathname.replace(/\/+$/, "").replace(/\/api$/, "");
  return `${scheme}//${u.host}${path}/ws`;
}

/** 1008 = no auth in 5 s, invalid or expired token: never retry with the same token. */
export function closeAction(code: number, stopped: boolean): CloseAction {
  if (stopped) return "none";
  return code === 1008 ? "login" : "reconnect";
}

/** 1 s doubling per attempt, ±25% jitter, capped at 30 s. */
export function backoffDelay(attempt: number, r: number = Math.random()): number {
  return Math.min(30000, 1000 * 2 ** attempt * (0.75 + r * 0.5));
}

/** Routes {type, payload} messages to the handlers registered for that type; unknown types and bad frames are ignored. */
export function createDispatcher() {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();
  return {
    on(type: string, handler: (payload: unknown) => void): () => void {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(handler);
      return () => { handlers.get(type)?.delete(handler); };
    },
    dispatch(raw: string): ServerMessage | null {
      let msg: unknown;
      try { msg = JSON.parse(raw); } catch { return null; }
      if (!msg || typeof msg !== "object" || typeof (msg as { type?: unknown }).type !== "string") return null;
      const m = { type: (msg as { type: string }).type, payload: (msg as { payload?: unknown }).payload ?? {} };
      for (const h of handlers.get(m.type) ?? []) {
        try { h(m.payload); } catch (e) { console.error(`socket handler for ${m.type} failed`, e); }
      }
      return m;
    },
  };
}
