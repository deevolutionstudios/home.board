/**
 * 12-hour time without AM/PM, matching the wall clock (e.g. "9:05", midnight = "12:05").
 */
export function time12(d: Date, timeZone?: string): string {
  const s = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
  });
  return s.replace(/\s?[AP]M/i, "").trim();
}

/**
 * Same 12-hour style for a timezone-naive ISO string like "2026-10-28T17:00"
 * (Open-Meteo returns Berlin-local times), so it never depends on device timezone.
 */
export function isoTime12(iso: string): string {
  const h = parseInt(iso.slice(11, 13), 10) % 12 || 12;
  const m = iso.slice(14, 16);
  return `${h}:${m}`;
}
