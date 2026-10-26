/**
 * Date helpers. Bookings are stored as calendar dates (YYYY-MM-DD) in Botswana local time
 * (Africa/Gaborone, UTC+2, no daylight saving), with a start time "HH:MM".
 */

export const BW_OFFSET_MINUTES = 120;

export function todayInBotswana(now = new Date()): string {
  const shifted = new Date(now.getTime() + BW_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Absolute instant a departure starts, given its Botswana local date + time. */
export function startInstant(date: string, time: string): Date {
  const [h, m] = (time || "00:00").split(":").map(Number);
  const utc = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    h,
    m,
  );
  return new Date(utc - BW_OFFSET_MINUTES * 60_000);
}

export function dayOfWeek(date: string): number {
  return new Date(date + "T00:00:00Z").getUTCDay();
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function hoursUntil(date: string, time: string, now = new Date()): number {
  return (startInstant(date, time).getTime() - now.getTime()) / 3_600_000;
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Gaborone",
  });
}
