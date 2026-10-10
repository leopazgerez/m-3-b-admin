/**
 * Utility functions for parsing various application date formats to ISO YYYY-MM-DD
 * and checking date range filters.
 */

/** Local-time YYYY-MM-DD (toISOString is UTC and shifts the day after 21:00 in Argentina). */
export function toLocalISODate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD -> DD/MM/YYYY, the stored format for dates entered in the app. */
export function isoToStoredDate(isoDate: string = toLocalISODate()): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

export function parseDateToYYYYMMDD(dateStr?: string): string {
  if (!dateStr || dateStr === "Sin registros" || dateStr === "Sin compras") {
    return "";
  }

  const trimmed = dateStr.trim();

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // If starts with YYYY-MM-DD (e.g. ISO string)
  const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) {
    return isoPrefix[1];
  }

  // If "Hoy"
  if (trimmed.toLowerCase().includes("hoy")) {
    return toLocalISODate();
  }

  // DD/MM/YYYY or DD/MM/YYYY HH:mm
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // "19 Sep" or "10 Sep 2026"
  const dayMonth = trimmed.match(/^(\d{1,2})\s+([a-zA-ZáéíóúÁÉÍÓÚ]+)(?:\s+(\d{4}))?/i);
  if (dayMonth) {
    const day = dayMonth[1].padStart(2, "0");
    const monthName = dayMonth[2].toLowerCase().slice(0, 3);
    const monthsMap: Record<string, string> = {
      ene: "01",
      feb: "02",
      mar: "03",
      abr: "04",
      may: "05",
      jun: "06",
      jul: "07",
      ago: "08",
      sep: "09",
      oct: "10",
      nov: "11",
      dic: "12",
    };
    const month = monthsMap[monthName] || "09";
    const year = dayMonth[3] || new Date().getFullYear().toString();
    return `${year}-${month}-${day}`;
  }

  // Fallback to Date parser
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return toLocalISODate(parsed);
  }

  return "";
}

/**
 * Checks if a target date string falls between dateFrom and dateTo (inclusive).
 * Format of dateFrom and dateTo is expected to be YYYY-MM-DD.
 */
export function isDateInRange(
  targetDate?: string,
  dateFrom?: string,
  dateTo?: string
): boolean {
  if (!dateFrom && !dateTo) return true;
  if (!targetDate) return false;

  const iso = parseDateToYYYYMMDD(targetDate);
  if (!iso) return false;

  if (dateFrom && iso < dateFrom) return false;
  if (dateTo && iso > dateTo) return false;

  return true;
}
