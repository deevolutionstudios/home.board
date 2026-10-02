import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, MapPin, Store } from "lucide-react";
import { getUpcomingEvents, type CalEvent } from "@/lib/calendar.functions";
import { useHolidays } from "./useHolidays";

export const calendarKey = ["calendar"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function eventDay(e: CalEvent) {
  return e.allDay ? e.start.slice(0, 10) : dayKey(new Date(e.start));
}
const time = (s: string) => new Date(s).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const timeRange = (e: CalEvent) => (e.allDay ? "All day" : `${time(e.start)} – ${time(e.end)}`);

function TodayEvent({ e }: { e: CalEvent }) {
  const [open, setOpen] = useState(false);
  const past = !e.allDay && new Date(e.end) < new Date();
  const hasDetails = Boolean(e.location || e.description);
  return (
    <li className={`grid grid-cols-[1.5rem_8rem_1fr] gap-x-4 rounded-2xl bg-muted/60 px-4 py-3 ${past ? "opacity-40" : ""}`}>
      <span className="h-8 w-1.5 self-center rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
      <span className="self-center tabular-nums text-lg text-muted-foreground">{timeRange(e)}</span>
      {e.htmlLink ? (
        <a
          href={e.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 self-center truncate text-xl underline-offset-4 hover:text-primary hover:underline active:text-primary"
        >
          {e.title}
        </a>
      ) : (
        <span className="min-w-0 self-center truncate text-xl">{e.title}</span>
      )}
      {hasDetails && (
        <div className="col-span-2 col-start-2 mt-2 space-y-1.5">
          {e.location && (
            <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0">{e.location}</span>
            </p>
          )}
          {e.description && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="block w-full text-left"
            >
              <p className={`whitespace-pre-line text-sm leading-relaxed text-muted-foreground ${open ? "" : "line-clamp-2"}`}>
                {e.description}
              </p>
            </button>
          )}
        </div>
      )}
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

  const holidays = useHolidays();
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
            {todays.map((e) => <TodayEvent key={e.id} e={e} />)}
          </ul>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-5">
            {days.slice(1).map((d) => {
              const evs = byDay(d);
              const hol = holidays[dayKey(d)];
              return (
                <div key={dayKey(d)} className={`min-w-0 ${hol ? "rounded-xl border border-destructive/50 bg-destructive/10 p-2" : ""}`}>
                  <p className={`mb-2 font-display text-lg font-light ${hol ? "text-destructive" : ""}`}>
                    {d.toLocaleDateString("en-GB", { weekday: "long" })}
                    <span className={`ml-2 ${hol ? "" : "text-muted-foreground"}`}>{d.getDate()}</span>
                  </p>
                  {hol && (
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-destructive">
                      <Store className="h-4 w-4 shrink-0" /> Stores closed
                    </p>
                  )}
                  <ul className="space-y-1.5">
                    {evs.length === 0 && <li className="text-sm text-muted-foreground">Free</li>}
                    {evs.slice(0, 4).map((e) => (
                      <li key={e.id} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color ?? "var(--primary)" }} />
                        <span className="shrink-0 tabular-nums text-muted-foreground">{e.allDay ? "·" : time(e.start)}</span>
                        {e.htmlLink ? (
                          <a
                            href={e.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-w-0 truncate underline-offset-4 hover:text-primary hover:underline active:text-primary"
                          >
                            {e.title}
                          </a>
                        ) : (
                          <span className="truncate">{e.title}</span>
                        )}
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
