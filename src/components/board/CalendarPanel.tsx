import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays } from "lucide-react";
import { getUpcomingEvents, type CalEvent } from "@/lib/calendar.functions";

export const calendarKey = ["calendar"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function eventDay(e: CalEvent) {
  return e.allDay ? e.start.slice(0, 10) : dayKey(new Date(e.start));
}
const time = (s: string) => new Date(s).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function EventRow({ e, big }: { e: CalEvent; big?: boolean }) {
  const past = !e.allDay && new Date(e.end) < new Date();
  return (
    <li className={`flex items-center gap-4 rounded-2xl bg-muted/60 px-4 ${big ? "py-3" : "py-2"} ${past ? "opacity-40" : ""}`}>
      <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
      <span className={`w-24 shrink-0 tabular-nums text-muted-foreground ${big ? "text-lg" : "text-sm"}`}>
        {e.allDay ? "All day" : time(e.start)}
      </span>
      <span className={`min-w-0 truncate ${big ? "text-xl" : "text-base"}`}>{e.title}</span>
    </li>
  );
}

export function CalendarPanel() {
  const fetchEvents = useServerFn(getUpcomingEvents);
  const { data, isError, error } = useQuery({
    queryKey: calendarKey,
    queryFn: () => fetchEvents(),
    refetchInterval: 5 * 60_000,
  });

  const today = new Date();
  const days = [0, 1, 2, 3].map((o) => {
    const d = new Date(today);
    d.setDate(d.getDate() + o);
    return d;
  });
  const byDay = (d: Date) => (data ?? []).filter((e) => eventDay(e) === dayKey(d));
  const todays = byDay(today);

  return (
    <section className="glass flex min-h-0 flex-col rounded-3xl p-6">
      <h2 className="mb-4 flex items-center gap-3 font-display text-2xl font-light tracking-wide">
        <CalendarDays className="h-6 w-6 text-primary" /> Today
      </h2>
      {isError && <p className="text-destructive">Calendar couldn't load: {(error as Error).message}</p>}
      {!data && !isError && <p className="text-muted-foreground">Loading calendar…</p>}
      {data && (
        <>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
            {todays.length === 0 && <li className="py-6 text-center text-lg text-muted-foreground">Nothing scheduled today</li>}
            {todays.map((e) => <EventRow key={e.id} e={e} big />)}
          </ul>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5">
            {days.slice(1).map((d) => {
              const evs = byDay(d);
              return (
                <div key={dayKey(d)} className="min-w-0">
                  <p className="mb-2 font-display text-lg font-light">
                    {d.toLocaleDateString("en-GB", { weekday: "long" })}
                    <span className="ml-2 text-muted-foreground">{d.getDate()}</span>
                  </p>
                  <ul className="space-y-1.5">
                    {evs.length === 0 && <li className="text-sm text-muted-foreground">Free</li>}
                    {evs.slice(0, 4).map((e) => (
                      <li key={e.id} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
                        <span className="shrink-0 tabular-nums text-muted-foreground">{e.allDay ? "·" : time(e.start)}</span>
                        <span className="truncate">{e.title}</span>
                      </li>
                    ))}
                    {evs.length > 4 && <li className="text-sm text-muted-foreground">+{evs.length - 4} more</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
