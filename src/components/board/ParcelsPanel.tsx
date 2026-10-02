import { useState } from "react";
import { ExternalLink, Package, Plus, RefreshCw, X } from "lucide-react";
import type { Parcel, ParcelCarrier } from "./useParcels";
import { Button } from "@/components/ui/button";

type Props = {
  parcels: Parcel[];
  adding: boolean;
  onCloseAdd: () => void;
  onAdd: (carrier: ParcelCarrier, label: string, tracking: string) => void;
  onRemove: (id: string) => void;
  onCheck: () => void;
};

const CARRIERS: { id: ParcelCarrier; name: string; track?: (n: string) => string }[] = [
  { id: "dhl", name: "DHL / Post", track: (n) => `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(n)}` },
  { id: "hermes", name: "Hermes", track: (n) => `https://www.myhermes.de/meine-pakete/sendungsverfolgung/sendungsid/${encodeURIComponent(n)}` },
  { id: "dpd", name: "DPD", track: (n) => `https://tracking.dpd.de/parcelstatus?q=${encodeURIComponent(n)}&locale=de_DE` },
  { id: "gls", name: "GLS", track: (n) => `https://gls-group.com/DE/en/parcel-tracking?match=${encodeURIComponent(n)}` },
  { id: "amazon", name: "Amazon", track: (n) => `https://t.17track.net/en#nums=${encodeURIComponent(n)}` },
  { id: "other", name: "Other", track: (n) => `https://t.17track.net/en#nums=${encodeURIComponent(n)}` },
];

const berlin = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function estText(d: string | null): string {
  if (!d) return "";
  const today = berlin(new Date());
  if (d < today) return "";
  const days = Math.round((Date.parse(`${d}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / 86_400_000);
  const when = days === 0 ? "today" : days === 1 ? "tomorrow" : `${days} days`;
  return `est. ${fmtDate(d)} · ${when}`;
}

function statusOf(p: Parcel): { text: string; cls: string } {
  if (p.arrived || p.status === "delivered") return { text: "Delivered", cls: "text-primary" };
  switch (p.status) {
    case "label": return { text: "Label created", cls: "text-muted-foreground" };
    case "picked_up": return { text: "Picked up", cls: "text-foreground" };
    case "in_transit": return { text: "On the way", cls: "text-foreground" };
    case "out_for_delivery": return { text: "Out for delivery today", cls: "text-primary" };
    case "pickup": return { text: "Ready for pickup", cls: "text-primary" };
    case "problem": return { text: "Delivery problem — check tracking", cls: "text-destructive" };
    default: return { text: p.tracking_number ? "Waiting for first scan" : "No tracking number", cls: "text-muted-foreground" };
  }
}

const STEPS = ["Label", "Picked up", "On the way", "Out for delivery", "Delivered"];

function stepIndex(p: Parcel): number {
  if (p.arrived || p.status === "delivered") return 4;
  switch (p.status) {
    case "out_for_delivery":
    case "pickup": return 3;
    case "in_transit":
    case "problem": return 2;
    case "picked_up": return 1;
    case "label": return 0;
    default: return -1;
  }
}

function Steps({ parcel }: { parcel: Parcel }) {
  const idx = stepIndex(parcel);
  const problem = parcel.status === "problem";
  return (
    <span className="mt-2 mb-1 flex items-start pr-2" aria-label={`Progress: ${idx + 1} of 5`}>
      {STEPS.map((name, i) => {
        const reached = i <= idx;
        const current = i === idx;
        return (
          <span key={name} className="flex min-w-0 flex-1 flex-col items-center last:flex-none last:w-auto">
            <span className="flex w-full items-center">
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 transition ${
                  reached
                    ? problem && current ? "border-destructive bg-destructive" : "border-primary bg-primary"
                    : "border-muted-foreground/40 bg-transparent"
                } ${current && !problem && i < 4 ? "ring-4 ring-primary/30" : ""}`}
              />
              {i < STEPS.length - 1 && (
                <span className={`h-0.5 flex-1 ${i < idx ? "bg-primary" : "bg-muted-foreground/25"}`} />
              )}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function ParcelsPanel({ parcels, adding, onCloseAdd, onAdd, onRemove, onCheck }: Props) {
  const [carrier, setCarrier] = useState<ParcelCarrier>("dhl");
  const [label, setLabel] = useState("");
  const [tracking, setTracking] = useState("");
  const [checking, setChecking] = useState(false);

  if (!adding && parcels.length === 0) return null;

  const checkNow = async () => {
    setChecking(true);
    try {
      await onCheck();
    } finally {
      setChecking(false);
    }
  };

  const submit = () => {
    if (!tracking.trim() && !label.trim()) return;
    onAdd(carrier, label, tracking);
    setLabel("");
    setTracking("");
    onCloseAdd();
  };

  return (
    <section className="glass rounded-3xl p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-xl sm:text-2xl font-light tracking-wide">
          <span className="text-primary"><Package className="h-6 w-6" /></span>
          Parcels
        </h2>
        <Button
          type="button"
          variant="ghost"
          onClick={checkNow}
          disabled={checking}
          aria-label="Check parcel status now"
          className="flex items-center gap-2 rounded-full bg-secondary min-h-11 px-4 text-sm text-muted-foreground active:scale-95 [&_svg]:size-4"
        >
          <RefreshCw className={checking ? "animate-spin" : ""} />
          {checking ? "Checking…" : "Check now"}
        </Button>
      </header>

      {adding && (
        <form
          onSubmit={(e) => { e.preventDefault(); submit(); }}
          className="mb-4 space-y-3 rounded-2xl bg-muted/60 p-4"
        >
          <div className="flex flex-wrap gap-2">
            {CARRIERS.map((c) => (
               <Button
                key={c.id}
                type="button"
                 variant="ghost"
                onClick={() => setCarrier(c.id)}
                className={`rounded-full min-h-11 px-4 py-2 text-sm active:scale-95 ${
                  carrier === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {c.name}
               </Button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              maxLength={60}
              autoFocus
              placeholder="Tracking number"
              className="h-12 min-w-0 flex-1 rounded-2xl border border-input bg-muted px-4 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
              placeholder="Note (e.g. TV, Prinz delivery)"
              className="h-12 min-w-0 flex-1 rounded-2xl border border-input bg-muted px-4 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-2">
             <Button type="button" variant="ghost" onClick={onCloseAdd} className="rounded-2xl bg-secondary min-h-12 px-5 text-muted-foreground active:scale-95">
              Cancel
             </Button>
             <Button type="submit" className="flex items-center gap-2 rounded-2xl bg-primary min-h-12 px-5 font-medium text-primary-foreground active:scale-95 [&_svg]:size-5">
              <Plus className="h-5 w-5" /> Track parcel
             </Button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {parcels.map((p) => {
          const s = statusOf(p);
          const c = CARRIERS.find((x) => x.id === p.carrier);
          const url = p.tracking_number ? c?.track?.(p.tracking_number) : undefined;
          const done = p.arrived || p.status === "delivered";
          return (
              <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-1 rounded-2xl bg-muted/60 py-3 pl-4 pr-1 sm:gap-x-3 sm:pr-2">
                 <div className={`min-w-0 ${done ? "opacity-60" : ""}`}>
                   <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                     <span className="shrink-0 rounded-md bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary">{c?.name ?? "Other"}</span>
                     {!done && estText(p.expected_date) && (
                       <span className="text-sm text-muted-foreground">{estText(p.expected_date)}</span>
                     )}
                   </div>
                   <p className="mt-1 break-words text-base leading-snug sm:text-lg">{p.label || p.tracking_number || "Package"}</p>
                   <p className={`mt-0.5 text-sm ${s.cls}`}>{s.text}</p>
                   <Steps parcel={p} />
                 </div>
                 <div className="flex shrink-0 items-center">
                   {url && (
                     <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Track on carrier site" className="grid h-11 w-11 shrink-0 place-items-center text-muted-foreground active:text-foreground sm:h-14 sm:w-14">
                       <ExternalLink className="h-5 w-5" />
                     </a>
                   )}
                   <Button type="button" variant="ghost" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.label || p.tracking_number || "parcel"}`} title="Remove" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-muted-foreground active:text-destructive sm:h-14 sm:w-14">
                     <X className="h-5 w-5" />
                   </Button>
                 </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
