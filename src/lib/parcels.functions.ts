import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Live parcel status via 17TRACK (one key covers DHL, Hermes, DPD, GLS, Amazon…).
// The board has no login, so this uses the publishable key against the open board_parcels table.

const API = "https://api.17track.net/track/v2.2";
// 17TRACK counts each status check against the account's quota; once a number is
// registered it is monitored server-side, so we only poll every 2 hours.
const RECHECK_MS = 2 * 60 * 60_000;

type TrackItem = {
  number: string;
  track_info?: {
    latest_status?: { status?: string; sub_status?: string };
    latest_event?: { description?: string; time_iso?: string; location?: string };
    time_metrics?: { estimated_delivery_date?: { from?: string | null; to?: string | null } };
  };
};

function mapStatus(s?: string, sub?: string): string {
  switch (s) {
    case "InfoReceived": return "label";
    case "InTransit": return sub === "InTransit_PickedUp" ? "picked_up" : "in_transit";
    case "AvailableForPickup": return "pickup";
    case "OutForDelivery": return "out_for_delivery";
    case "Delivered": return "delivered";
    case "DeliveryFailure":
    case "Exception":
    case "Expired": return "problem";
    default: return "pending";
  }
}

function berlinDate(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

function berlinHour() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h + m / 60;
}

export const refreshParcels = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => (typeof input === "object" && input !== null ? input : {}) as { force?: boolean })
  .handler(async ({ data }) => {
  // Night quiet hours (10pm–6:30am Berlin): pause scheduled status checks.
  // A parcel that has never been scanned still gets its first check, so adding
  // one at night still registers and scans it immediately.
  const night = berlinHour() >= 22 || berlinHour() < 6.5;
  const token = process.env["TRACK17_API_KEY"];
  if (!token) return { ok: false, reason: "not_configured" as const };
  const url = (process.env["SUPABASE_URL"] ?? "https://nfktzfzpqcicnsrcgqjg.supabase.co") as string;
  const key = (process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "sb_publishable_t0gDwwFDcK3b8sokpbNiBw_oYRaJw8c") as string;
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });

  const { data: rows, error } = await db
    .from("board_parcels")
    .select("id, tracking_number, registered, checked_at, delivered_at")
    .is("delivered_at", null)
    .neq("tracking_number", "");
  if (error) return { ok: false, reason: "db" as const };

  const now = Date.now();
  const all = (rows ?? []).filter((r) => data.force || !r.checked_at || now - new Date(r.checked_at).getTime() > RECHECK_MS);
  const due = (night && !data.force ? all.filter((r) => !r.checked_at) : all).slice(0, 40);
  if (due.length === 0) return { ok: true, updated: 0, skipped: night && !data.force ? ("night" as const) : undefined };

  const call = async (path: string, body: unknown) => {
    const res = await fetch(`${API}/${path}`, {
      method: "POST",
      headers: { "17token": token, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`17track ${path} ${res.status}`);
    return (await res.json()) as { data?: { accepted?: TrackItem[]; rejected?: { number: string; error?: { code?: number } }[] } };
  };

  try {
    const toRegister = due.filter((r) => !r.registered);
    if (toRegister.length) {
      const reg = await call("register", toRegister.map((r) => ({ number: r.tracking_number })));
      const ok = new Set([
        ...(reg.data?.accepted ?? []).map((a) => a.number),
        // -18019901 = already registered on this account
        ...(reg.data?.rejected ?? []).filter((x) => x.error?.code === -18019901).map((x) => x.number),
      ]);
      for (const r of toRegister) if (ok.has(r.tracking_number)) {
        r.registered = true;
        await db.from("board_parcels").update({ registered: true }).eq("id", r.id);
      }
    }

    const info = await call("gettrackinfo", due.filter((r) => r.registered).map((r) => ({ number: r.tracking_number })));
    const byNum = new Map((info.data?.accepted ?? []).map((a) => [a.number, a]));
    let updated = 0;
    for (const r of due) {
      const item = byNum.get(r.tracking_number);
      const ti = item?.track_info;
      let status = mapStatus(ti?.latest_status?.status, ti?.latest_status?.sub_status);
      const eta = ti?.time_metrics?.estimated_delivery_date?.from;
      // 17TRACK often keeps DHL parcels at "InTransit" even once they're at the local
      // delivery base / on the van, so read the latest scan text as well.
      if (status === "in_transit") {
        const desc = ti?.latest_event?.description ?? "";
        const today = berlinDate(new Date().toISOString());
        const dueToday = !!eta && berlinDate(eta) === today;
        const scannedToday = !!ti?.latest_event?.time_iso && berlinDate(ti.latest_event.time_iso) === today;
        if (
          /out for delivery|delivery vehicle|loaded onto|in zustellung|zustellfahrzeug|processed in the delivery base|zustellbasis bearbeitet/i.test(desc) ||
          ((dueToday || scannedToday) && /delivery base|zustellbasis|destination country|zielland|region of (the )?recipient|sorting center/i.test(desc))
        ) status = "out_for_delivery";
      }
      const update: Database["public"]["Tables"]["board_parcels"]["Update"] = {
        status,
        status_detail: (ti?.latest_event?.description ?? "").slice(0, 200),
        checked_at: new Date().toISOString(),
      };
      if (eta) update.expected_date = berlinDate(eta);
      else if (status === "out_for_delivery") update.expected_date = berlinDate(new Date().toISOString());
      if (status === "delivered") {
        update.arrived = true;
        update.delivered_at = ti?.latest_event?.time_iso ?? new Date().toISOString();
      }
      await db.from("board_parcels").update(update).eq("id", r.id);
      updated++;
    }
    return { ok: true, updated };
  } catch (e) {
    console.error("refreshParcels failed", e);
    return { ok: false, reason: "provider" as const };
  }
});
