import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { refreshParcels } from "@/lib/parcels.functions";

export type ParcelCarrier = "dhl" | "hermes" | "dpd" | "gls" | "amazon" | "other";
export type Parcel = {
  id: string;
  carrier: string;
  tracking_number: string;
  label: string;
  expected_date: string | null;
  arrived: boolean;
  created_at: string;
  status: string;
  status_detail: string;
  delivered_at: string | null;
};

const KEEP_MS = 24 * 60 * 60_000;

export function useParcels() {
  const [all, setAll] = useState<Parcel[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = (fn: () => Promise<unknown>) => {
    queue.current = queue.current.then(fn).catch(() => {});
    return queue.current;
  };

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("board_parcels")
      .select("*")
      .order("arrived", { ascending: true })
      .order("expected_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (data) setAll(data as Parcel[]);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await refreshParcels();
    } catch {
      /* status stays as last known */
    }
    await load();
  }, [load]);

  useEffect(() => {
    void refresh();
    const channel = supabase
      .channel("board_parcels")
      .on("postgres_changes", { event: "*", schema: "public", table: "board_parcels" }, () => load())
      .subscribe();
    const t = setInterval(() => { setNow(Date.now()); void refresh(); }, 60 * 60_000);
    return () => {
      clearInterval(t);
      supabase.removeChannel(channel);
    };
  }, [load, refresh]);

  // Delivered parcels stay visible for 24 hours, then quietly disappear.
  const expired = all.filter((p) => p.delivered_at && now - new Date(p.delivered_at).getTime() > KEEP_MS);
  useEffect(() => {
    if (expired.length) void supabase.from("board_parcels").delete().in("id", expired.map((p) => p.id));
  }, [expired.map((p) => p.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const parcels = all.filter((p) => !expired.includes(p));

  const add = (carrier: ParcelCarrier, label: string, tracking: string) =>
    enqueue(async () => {
      const l = label.trim().slice(0, 100);
      const n = tracking.replace(/\s+/g, "").slice(0, 60);
      if (!l && !n) return;
      await supabase.from("board_parcels").insert({ carrier, label: l, tracking_number: n });
      await refresh();
    });
  const toggle = (p: Parcel) =>
    enqueue(async () => {
      const arrived = !p.arrived;
      setAll((list) => list.map((i) => (i.id === p.id ? { ...i, arrived } : i)));
      await supabase
        .from("board_parcels")
        .update({ arrived, delivered_at: arrived ? new Date().toISOString() : null, status: arrived ? "delivered" : "pending" })
        .eq("id", p.id);
    });
  const remove = (id: string) =>
    enqueue(async () => {
      setAll((list) => list.filter((i) => i.id !== id));
      await supabase.from("board_parcels").delete().eq("id", id);
    });

  return { parcels, add, toggle, remove };
}
