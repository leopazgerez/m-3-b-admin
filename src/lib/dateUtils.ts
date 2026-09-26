/**
 * Utility functions for parsing various application date formats to ISO YYYY-MM-DD
 * and checking date range filters.
 */

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
    return new Date().toISOString().split("T")[0];
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
    return parsed.toISOString().split("T")[0];
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

/**
 * Formats YYYY-MM-DD date to a human readable short format, e.g. "26 Sep"
 */
export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return "Hoy";
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const monthStr = months[month - 1] || "";
    return `${day} ${monthStr}`;
  }
  return isoDate;
}
