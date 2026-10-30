import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type Page } from "./api";
import type { ListQuery } from "./apiQuery";

interface Result<T> { key: string; data: T | null; error: ApiError | null }

const toApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError(0, e instanceof Error ? e.message : String(e)));

// Runs load() whenever key changes or reload() is called; responses of superseded runs are dropped.
function useLoad<T>(load: () => Promise<T>, baseKey: string) {
  const [tick, setTick] = useState(0);
  const [res, setRes] = useState<Result<T>>({ key: "", data: null, error: null });
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; });
  const key = `${baseKey}#${tick}`;
  useEffect(() => {
    let stale = false;
    loadRef.current().then(
      (data) => { if (!stale) setRes({ key, data, error: null }); },
      (e) => { if (!stale) setRes({ key, data: null, error: toApiError(e) }); },
    );
    return () => { stale = true; };
  }, [key]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  // loaded: some run has settled, so a null data is a real null and not "not fetched yet"
  return { data: res.data, error: res.error, loading: res.key !== key, loaded: res.key !== "", reload };
}

export function useApiResource<T>(load: () => Promise<T>, deps: unknown[]) {
  return useLoad(load, JSON.stringify(deps));
}

type Position = { qk: string; cursor?: string; before?: string };

export function usePagedList<T>(path: string, query: Omit<ListQuery, "cursor" | "before">) {
  const qk = path + JSON.stringify(query);
  const [pos, setPos] = useState<Position>({ qk });
  if (pos.qk !== qk) setPos({ qk }); // query change => first page, and forget the old cursor
  const cur = pos.qk === qk ? pos : { qk };
  const { data, error, loading, reload } = useLoad<Page<T>>(
    () => api.getPage<T>(path, { ...query, cursor: cur.cursor, before: cur.before }),
    `${qk}|${cur.cursor ?? ""}|${cur.before ?? ""}`,
  );
  const next = useCallback(() => { if (!loading && data?.nextCursor) setPos({ qk, cursor: data.nextCursor }); }, [data, qk, loading]);
  const prev = useCallback(() => { if (!loading && data?.prevCursor) setPos({ qk, before: data.prevCursor }); }, [data, qk, loading]);
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    loading,
    error,
    hasNext: !!data?.nextCursor,
    hasPrev: !!data?.prevCursor,
    next,
    prev,
    reload,
  };
}

export function useOptions<T>(path: string, q: Omit<ListQuery, "cursor" | "before" | "length"> = {}) {
  const { data, loading, error, reload } = useLoad(() => api.getAll<T>(path, q), path + JSON.stringify(q));
  return { options: data ?? [], loading, error, reload };
}
