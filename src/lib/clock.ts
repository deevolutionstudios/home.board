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

// ============= Auto night mode =============
// Screen dims automatically between 23:00 and 06:30 Europe/Berlin.
// A manual Night toggle or wake tap overrides the schedule until the next
// window boundary (23:00 or 06:30), so the household keeps final say.

export const NIGHT_START_MIN = 23 * 60; // 23:00
export const NIGHT_END_MIN = 6 * 60 + 30; // 06:30

export function berlinMinutes(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return (get("hour") % 24) * 60 + get("minute");
}

/**
 * Decide what the display should do right now.
 * - night: true → dim, false → bright, null → leave as-is (manual override stands)
 * - windowChanged: true → a 23:00 / 06:30 boundary was crossed, manual override expired
 */
export function autoNight(
  now: Date,
  storedWindow: string | null,
  manual: string | null,
): { id: string; night: boolean | null; windowChanged: boolean } {
  const m = berlinMinutes(now);
  const inWindow = m >= NIGHT_START_MIN || m < NIGHT_END_MIN;
  // The night window that started yesterday 23:00 runs past midnight,
  // so its id is keyed to the window's start date.
  const day = inWindow && m < NIGHT_END_MIN ? new Date(now.getTime() - 86_400_000) : now;
  const id = (inWindow ? "n:" : "d:") + day.toLocaleDateString("en-CA", { timeZone: "Europe/Berlin" });
  const windowChanged = storedWindow !== id;
  const effectiveManual = windowChanged ? null : manual;
  if (inWindow) return { id, night: effectiveManual === "off" ? null : true, windowChanged };
  return { id, night: effectiveManual === "on" ? null : false, windowChanged };
}
