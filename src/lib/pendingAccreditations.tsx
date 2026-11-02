"use client";

import { createContext, useContext } from "react";
import { api } from "./api";
import { useApiResource, useReloadOnWrite } from "./useApi";
import { PENDING_ACCREDITATION } from "./accreditation";
import type { Payment } from "./apiTypes";

const PendingContext = createContext<number | null>(null);

/** One shared count for the sidebar and /caja: card payments waiting for the bank, re-counted after every write. */
export function PendingAccreditationsProvider({ children }: { children: React.ReactNode }) {
  const r = useApiResource(
    () => api.getPage<Payment>("/payments", { length: 1, filters: PENDING_ACCREDITATION }, { quiet: true }),
    [],
  );
  useReloadOnWrite(r.reload);
  return <PendingContext.Provider value={r.data?.total ?? null}>{children}</PendingContext.Provider>;
}

/** null until known. Hint only. */
export const usePendingAccreditations = () => useContext(PendingContext);
