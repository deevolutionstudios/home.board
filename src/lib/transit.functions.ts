import { createServerFn } from "@tanstack/react-start";

export type Departure = {
  line: string;
  destination: string;
  minutes: number;
  time: string;
  delay: number;
  cancelled: boolean;
  platform?: number;
};

type Raw = {
  label: string;
  destination: string;
  plannedDepartureTime: number;
  realtimeDepartureTime: number;
  delayInMinutes?: number;
  cancelled: boolean;
  platform?: number;
};

// Westbound S3 termini from Donnersbergerbrücke — excluded so only eastbound trains show.
const WESTBOUND = ["mammendorf", "maisach", "geltendorf", "pasing"];
// Northbound termini at Donnersbergerstraße — excluded so only southbound departures show.
// Bus 53: Münchner Freiheit. Bus 63: Rotkreuzplatz / Landshuter Allee. Bus 153: Odeonsplatz / Giesing.
const BUS_NORTHBOUND = [
  "münchner freiheit",
  "muenchner freiheit",
  "munchner freiheit",
  "rotkreuzplatz",
  "landshuter allee",
  "odeonsplatz",
  "giesing",
];

async function fetchStop(globalId: string, lines: string[], types: string, eastboundOnly = false, southboundOnly = false): Promise<Departure[]> {
  const r = await fetch(
    `https://www.mvg.de/api/bgw-pt/v3/departures?globalId=${globalId}&limit=40&transportTypes=${types}`,
    { headers: { Accept: "application/json" } },
  );
  if (!r.ok) throw new Error(`MVG ${r.status}`);
  const raw = (await r.json()) as Raw[];
  const now = Date.now();
  return raw
    .filter((d) => lines.includes(d.label))
    .filter((d) => !eastboundOnly || !WESTBOUND.some((w) => d.destination.toLowerCase().includes(w)))
    .filter((d) => !southboundOnly || !BUS_NORTHBOUND.some((w) => d.destination.toLowerCase().includes(w)))
    .slice(0, 4)
    .map((d) => {
      const t = d.realtimeDepartureTime || d.plannedDepartureTime;
      return {
        line: d.label,
        destination: d.destination,
        minutes: Math.max(0, Math.round((t - now) / 60_000)),
        time: new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }),
        delay: d.delayInMinutes ?? 0,
        cancelled: d.cancelled,
        ...(typeof d.platform === "number" ? { platform: d.platform } : {}),
      };
    });
}

export const getDepartures = createServerFn({ method: "GET" }).handler(async () => {
  const [s3, bus] = await Promise.allSettled([
    fetchStop("de:09162:8", ["S3"], "SBAHN", true),
    fetchStop("de:09162:54", ["53", "63", "153"], "BUS", false, true),
  ]);
  return {
    s3: s3.status === "fulfilled" ? s3.value : null,
    bus: bus.status === "fulfilled" ? bus.value : null,
  };
});
