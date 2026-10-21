import { env } from "@/config/env";
import { collectAll, errorInfo, toSearchParams, type ListQuery } from "./apiQuery";
import { clearSession, getSession } from "./session";

export class ApiError extends Error {
  status: number;
  field?: string;
  details?: unknown;

  constructor(status: number, message: string, field?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.field = field;
    this.details = details;
  }
}

export interface Page<T> { items: T[]; nextCursor: string | null; prevCursor: string | null; total: number }

interface RawPage<T> { data: T[]; nextCursor: string | null; prevCursor: string | null; total: number }

/** Every m3b-api body is {start, length, total, data, ...}; returns the parsed body as-is (204 → undefined). */
async function request(method: string, path: string, query?: URLSearchParams, body?: unknown): Promise<unknown> {
  const qs = query?.toString();
  const url = `${env.apiUrl}${path}${qs ? `?${qs}` : ""}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getSession()?.accessToken;
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, `No se pudo conectar con la API (${env.apiUrl})`);
  }

  if (res.status === 204) return undefined;
  const text = await res.text();
  let parsed: unknown = undefined;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    if (res.status === 401 && path !== "/auth/login") {
      clearSession();
      // outside React, and a full reload drops any in-memory state of the expired session
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `${env.basePath}/login/`;
    }
    const { message, field, details } = errorInfo(res.status, parsed);
    throw new ApiError(res.status, message, field, details);
  }
  return parsed;
}

function unwrap<T>(body: unknown): T {
  return (body && typeof body === "object" && "data" in body ? (body as { data: unknown }).data : body) as T;
}

function params(p?: Record<string, string | number | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(p ?? {})) if (v !== undefined && v !== "") out.set(k, String(v));
  return out;
}

async function getPage<T>(path: string, q: ListQuery = {}): Promise<Page<T>> {
  const r = (await request("GET", path, toSearchParams(q))) as RawPage<T>;
  return { items: r.data, nextCursor: r.nextCursor, prevCursor: r.prevCursor, total: r.total };
}

export const api = {
  getOne: async <T>(path: string, p?: Record<string, string | number | undefined>) =>
    unwrap<T>(await request("GET", path, params(p))),
  getPage,
  getAll: <T>(path: string, q: Omit<ListQuery, "cursor" | "before" | "length"> = {}) =>
    collectAll<T>((cursor) => getPage<T>(path, { ...q, length: 200, cursor })),
  post: async <T>(path: string, body?: unknown) => unwrap<T>(await request("POST", path, undefined, body)),
  patch: async <T>(path: string, body: unknown) => unwrap<T>(await request("PATCH", path, undefined, body)),
  del: async (path: string): Promise<void> => {
    await request("DELETE", path);
  },
};
