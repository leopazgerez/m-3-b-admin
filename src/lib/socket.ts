// The one server→client WebSocket of this tab. Plain module state (like feedback.ts), started by SocketProvider.
// The token goes only in the first {"type":"auth"} message, never in the URL.
import { env } from "@/config/env";
import { expireSession } from "./api";
import { getSession } from "./session";
import { backoffDelay, closeAction, createDispatcher, socketUrl } from "./socketProtocol";

export type SocketStatus = "idle" | "connecting" | "open" | "closed";

const dispatcher = createDispatcher();
const statusListeners = new Set<() => void>();
const reconnectListeners = new Set<() => void>();

let ws: WebSocket | null = null;
let status: SocketStatus = "idle";
let stopped = true;
let attempt = 0;
let authedOnce = false;
let retry: ReturnType<typeof setTimeout> | undefined;

function setStatus(s: SocketStatus) {
  status = s;
  statusListeners.forEach((l) => l());
}

function connect() {
  retry = undefined;
  const token = getSession()?.accessToken;
  if (!token) { stopped = true; expireSession(); return; }
  setStatus("connecting");
  const sock = new WebSocket(socketUrl(env.apiUrl));
  ws = sock;
  sock.onopen = () => sock.send(JSON.stringify({ type: "auth", token }));
  sock.onmessage = (ev) => { if (typeof ev.data === "string") dispatcher.dispatch(ev.data); };
  sock.onclose = (ev) => {
    if (ws !== sock) return;
    ws = null;
    setStatus("closed");
    const action = closeAction(ev.code, stopped);
    if (action === "login") { stopped = true; expireSession(); }
    else if (action === "reconnect") retry = setTimeout(connect, backoffDelay(attempt++));
  };
}

dispatcher.on("auth.ok", () => {
  attempt = 0;
  setStatus("open");
  if (authedOnce) reconnectListeners.forEach((l) => l());
  authedOnce = true;
});

export const socket = {
  /** Idempotent. */
  start() {
    if (!stopped) return;
    stopped = false;
    authedOnce = false;
    attempt = 0;
    connect();
  },
  stop() {
    stopped = true;
    clearTimeout(retry);
    retry = undefined;
    const sock = ws;
    ws = null;
    sock?.close(1000);
    setStatus("idle");
  },
  on<T>(type: string, handler: (payload: T) => void): () => void {
    return dispatcher.on(type, handler as (payload: unknown) => void);
  },
  /** Fires on every auth.ok after the first since start(): events sent while disconnected were lost. */
  onReconnect(l: () => void): () => void {
    reconnectListeners.add(l);
    return () => { reconnectListeners.delete(l); };
  },
  status: () => status,
  subscribe(l: () => void): () => void {
    statusListeners.add(l);
    return () => { statusListeners.delete(l); };
  },
};
