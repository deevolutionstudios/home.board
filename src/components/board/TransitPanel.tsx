import { useQuery } from "@tanstack/react-query";
import { Bus, TrainFront } from "lucide-react";
import { getDepartures, type Departure } from "@/lib/transit.functions";

function SubHeading({ title, Icon, badge }: { title: string; Icon?: typeof Bus; badge?: string }) {
  return (
    <p className="mt-3 mb-2 flex items-center gap-2 border-t border-border/60 pt-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
      {Icon && <Icon className="h-4 w-4" />}
      {badge && <span className="rounded-md bg-primary/20 px-1.5 py-0.5 text-xs font-semibold tracking-normal text-primary">{badge}</span>}
      {title}
    </p>
  );
}

function Column({
  title,
  Icon,
  items,
  sub,
}: {
  title: string;
  Icon: typeof Bus;
  items: Departure[] | null | undefined;
  sub?: { title: string; Icon?: typeof Bus; badge?: string; items: Departure[] | null | undefined };
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
        <Icon className="h-4 w-4" /> {title}
      </p>
      {items === undefined ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : items === null ? (
        <p className="text-muted-foreground">Unavailable</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No departures soon</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((d, i) => (
            <li key={i} className={`flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 ${d.cancelled ? "opacity-50 line-through" : ""}`}>
              <span className="shrink-0 rounded-md bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary">{d.line}</span>
              <span className="w-14 shrink-0 font-display text-xl tabular-nums">
                {d.minutes === 0 ? "now" : `${d.minutes}′`}
              </span>
              <span className="min-w-0 flex-1 truncate">{d.destination}</span>
              <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                {d.time}
                {d.delay > 0 && <span className="ml-1 text-destructive">+{d.delay}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {sub && (
        <div>
          <SubHeading title={sub.title} {...(sub.Icon ? { Icon: sub.Icon } : {})} {...(sub.badge ? { badge: sub.badge } : {})} />
          {sub.items === undefined || sub.items === null ? null : (
            <ul className="space-y-1.5">
              {sub.items.map((d, i) => (
                <li key={i} className={`flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 ${d.cancelled ? "opacity-50 line-through" : ""}`}>
                  <span className="shrink-0 rounded-md bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary">{d.line}</span>
                  <span className="w-14 shrink-0 font-display text-xl tabular-nums">
                    {d.minutes === 0 ? "now" : `${d.minutes}′`}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{d.destination}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {d.time}
                    {d.delay > 0 && <span className="ml-1 text-destructive">+{d.delay}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function TransitPanel() {
  const { data } = useQuery({
    queryKey: ["departures"],
    queryFn: () => getDepartures(),
    refetchInterval: 60_000,
  });
  return (
    <section className="glass grid gap-5 rounded-3xl p-6 md:grid-cols-2">
      <Column
        title="S3 · Donnersbergerbrücke"
        Icon={TrainFront}
        items={data?.s3}
        sub={{ title: "S3 · Taufkirchen", Icon: TrainFront, items: data?.s3taufkirchen }}
      />
      <Column title="Buses · Donnersbergerstr." Icon={Bus} items={data?.bus} />
    </section>
  );
}
