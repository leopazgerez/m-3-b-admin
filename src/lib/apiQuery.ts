export type FilterOperator =
  | "EQUALS" | "NOT_EQUALS" | "LIKE" | "GREATER_THAN" | "LESS_THAN"
  | "GREATER_OR_EQUAL" | "LESS_OR_EQUAL" | "BETWEEN" | "IN" | "IS_NULL" | "IS_NOT_NULL";

export interface Criterion { field: string; operator: FilterOperator; value?: unknown }

export interface ListQuery {
  length?: number;
  cursor?: string;
  before?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  filters?: Criterion[];
}

export function encodeFilter(filters: Criterion[]): string | undefined {
  if (filters.length === 0) return undefined;
  const json = JSON.stringify({ combinator: "AND", filters });
  return btoa(String.fromCharCode(...new TextEncoder().encode(json)));
}

export function toSearchParams(q: ListQuery): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  };
  set("length", q.length);
  set("cursor", q.cursor);
  set("before", q.before);
  set("sortBy", q.sortBy);
  set("sortDir", q.sortDir);
  if (q.search?.trim()) p.set("search", q.search);
  set("filter", encodeFilter(q.filters ?? []));
  return p;
}

function localDayStart(ymd: string, plusDays = 0): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d + plusDays).toISOString();
}

export function instantRangeCriteria(field: string, from?: string, to?: string): Criterion[] {
  const out: Criterion[] = [];
  if (from) out.push({ field, operator: "GREATER_OR_EQUAL", value: localDayStart(from) });
  if (to) out.push({ field, operator: "LESS_THAN", value: localDayStart(to, 1) });
  return out;
}

export function dateRangeCriteria(field: string, from?: string, to?: string): Criterion[] {
  const out: Criterion[] = [];
  if (from) out.push({ field, operator: "GREATER_OR_EQUAL", value: from });
  if (to) out.push({ field, operator: "LESS_OR_EQUAL", value: to });
  return out;
}

export async function collectAll<T>(
  fetchPage: (cursor?: string) => Promise<{ items: T[]; nextCursor: string | null }>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return all;
}

export function errorInfo(status: number, body: unknown): { message: string; field?: string; details?: unknown } {
  if (body && typeof body === "object" && typeof (body as { message?: unknown }).message === "string") {
    const b = body as { message: string; field?: unknown; details?: unknown };
    return { message: b.message, field: typeof b.field === "string" ? b.field : undefined, details: b.details };
  }
  return { message: `HTTP ${status}` };
}
