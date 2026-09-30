import { createServerFn } from "@tanstack/react-start";

export type WifiConfig = { ssid: string; password: string } | null;

export const getWifiConfig = createServerFn({ method: "GET" }).handler(async () => {
  const ssid = process.env["WIFI_SSID"]?.trim();
  const password = process.env["WIFI_PASSWORD"];
  if (!ssid || !password) return null;
  return { ssid, password };
});
