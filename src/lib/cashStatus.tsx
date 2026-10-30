"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { api, ApiError, API_WRITE_EVENT } from "./api";
import { useApiResource } from "./useApi";
import type { CashSession } from "./apiTypes";

/** GET /cash-sessions/current; 404 (no OPEN or PENDING_COUNT session) → null. */
const fetchCurrentCashSession = () =>
  api.getOne<CashSession>("/cash-sessions/current", undefined, { quiet: true }).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  });

/** Coming back to the tab re-checks at most this often; writes and closesAt re-check right away. */
const FOCUS_REFRESH_MS = 60_000;

interface CashStatus {
  /** false until the first answer: don't show "cerrada" before knowing */
  loaded: boolean;
  /** the OPEN or PENDING_COUNT session; null = caja closed */
  session: CashSession | null;
  /** known not OPEN (closed or pending count): forms that move money are blocked */
  closed: boolean;
  /** a re-check is in flight: forms that just changed the caja wait for it instead of resubmitting */
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

const CashStatusContext = createContext<CashStatus | null>(null);

/**
 * One shared current session for sidebar, dashboard, notices and /caja. Re-fetched (without the global loader) after
 * every write anywhere (a sale or a payment changes the figures; a 409 means it closed), when the tab becomes
 * visible again, and once closesAt passes.
 */
export function CashStatusProvider({ children }: { children: React.ReactNode }) {
  const fetchedAt = useRef(0);
  const r = useApiResource(() => {
    fetchedAt.current = Date.now();
    return fetchCurrentCashSession();
  }, []);
  const { reload } = r;
  const closesAt = r.data?.status === "OPEN" ? r.data.closesAt : null;

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - fetchedAt.current > FOCUS_REFRESH_MS) reload();
    };
    window.addEventListener(API_WRITE_EVENT, reload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(API_WRITE_EVENT, reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  // the automatic close: check a few seconds after it (a same closesAt never re-arms, so no loop if the server lags)
  useEffect(() => {
    if (!closesAt) return;
    const t = setTimeout(reload, Math.max(0, Date.parse(closesAt) - Date.now()) + 5000);
    return () => clearTimeout(t);
  }, [closesAt, reload]);

  return (
    <CashStatusContext.Provider value={{ loaded: r.loaded, session: r.data, closed: r.loaded && !r.error && r.data?.status !== "OPEN", loading: r.loading, error: r.error, reload }}>
      {children}
    </CashStatusContext.Provider>
  );
}

export function useCashStatus(): CashStatus {
  const c = useContext(CashStatusContext);
  if (!c) throw new Error("useCashStatus outside CashStatusProvider");
  return c;
}
