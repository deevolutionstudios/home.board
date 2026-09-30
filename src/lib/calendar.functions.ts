import { createServerFn } from "@tanstack/react-start";

export type CalEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendar: string;
  color: string | null;
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

export const getUpcomingEvents = createServerFn({ method: "GET" }).handler(async () => {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const calKey = process.env["GOOGLE_CALENDAR_API_KEY"];
  if (!lovableKey || !calKey) throw new Error("Google Calendar is not connected");
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": calKey };

  const listRes = await fetch(`${GATEWAY}/users/me/calendarList`, { headers });
  if (!listRes.ok) throw new Error(`Calendar list failed [${listRes.status}]: ${await listRes.text()}`);
  const list = (await listRes.json()) as {
    items?: { id: string; summary: string; backgroundColor?: string; selected?: boolean }[];
  };
  const calendars = (list.items ?? []).filter((c) => c.selected !== false).slice(0, 10);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1); // buffer for timezone differences; client filters
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const results = await Promise.all(
    calendars.map(async (c) => {
      const qs = new URLSearchParams({
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      });
      const r = await fetch(`${GATEWAY}/calendars/${encodeURIComponent(c.id)}/events?${qs}`, { headers });
      if (!r.ok) {
        console.error(`Events failed for ${c.summary} [${r.status}]: ${await r.text()}`);
        return [];
      }
      const d = (await r.json()) as {
        items?: {
          id: string;
          summary?: string;
          status?: string;
          start: { dateTime?: string; date?: string };
          end: { dateTime?: string; date?: string };
        }[];
      };
      return (d.items ?? [])
        .filter((e) => e.status !== "cancelled")
        .map<CalEvent>((e) => ({
          id: `${c.id}:${e.id}`,
          title: e.summary ?? "(No title)",
          start: e.start.dateTime ?? e.start.date ?? "",
          end: e.end.dateTime ?? e.end.date ?? "",
          allDay: !e.start.dateTime,
          calendar: c.summary,
          color: c.backgroundColor ?? null,
        }));
    }),
  );
  return results.flat().sort((a, b) => a.start.localeCompare(b.start));
});
