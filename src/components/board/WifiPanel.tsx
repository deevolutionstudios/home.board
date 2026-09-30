import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Wifi } from "lucide-react";
import qrcode from "qrcode-generator";
import { getWifiConfig, type WifiConfig } from "@/lib/wifi.functions";

function qrSvg(text: string) {
  const qr = qrcode(0, "M");
  qr.addData(text, "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const rects: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) rects.push(`<rect x="${c}" y="${r}" width="1" height="1"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="currentColor">${rects.join("")}</svg>`;
}

function wifiPayload(config: { ssid: string; password: string }) {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:WPA;S:${esc(config.ssid)};P:${esc(config.password)};H:false;;`;
}

export function WifiPanel() {
  const { data: config } = useQuery({
    queryKey: ["wifi"],
    queryFn: () => getWifiConfig(),
    staleTime: Infinity,
  });
  const [open, setOpen] = useState(false);
  if (!config) return null;

  const svg = qrSvg(wifiPayload(config));

  return (
    <>
      <section className="glass flex items-center gap-4 rounded-3xl p-4 sm:gap-5 sm:p-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Show Wi-Fi code larger"
          className="shrink-0 rounded-2xl bg-background/50 p-2 text-foreground transition active:scale-95 [&>svg]:h-16 [&>svg]:w-16 sm:[&>svg]:h-20 sm:[&>svg]:w-20"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">
            <Wifi className="h-4 w-4" /> Wi-Fi
          </p>
          <p className="mt-1 truncate font-display text-xl font-light sm:text-2xl">{config.ssid}</p>
          <p className="mt-1 text-xs text-muted-foreground">Point your camera here to join</p>
        </div>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-background/95 p-6 backdrop-blur-xl"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[70vmin] rounded-3xl bg-white p-6 text-black shadow-2xl [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="font-display text-2xl sm:text-3xl">{config.ssid}</p>
          <p className="text-sm text-muted-foreground">Tap anywhere to close</p>
        </div>
      )}
    </>
  );
}

export type { WifiConfig };
