import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun, Wind, Droplets, Umbrella, Snowflake, Sunrise, Sunset, TriangleAlert } from "lucide-react";

const URL =
  "https://api.open-meteo.com/v1/forecast?latitude=48.137&longitude=11.575&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability,snowfall&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Europe%2FBerlin&forecast_days=4";

function describe(code: number) {
  if (code === 0) return { label: "Clear", Icon: Sun };
  if (code <= 2) return { label: "Partly cloudy", Icon: CloudSun };
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if (code <= 48) return { label: "Fog", Icon: CloudFog };
  if (code <= 57) return { label: "Drizzle", Icon: CloudDrizzle };
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: "Rain", Icon: CloudRain };
  if (code <= 77 || code === 85 || code === 86) return { label: "Snow", Icon: CloudSnow };
  return { label: "Thunderstorm", Icon: CloudLightning };
}

function isSnowCode(code: number) {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

type WeatherData = {
  current: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; weather_code: number; wind_speed_10m: number };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; precipitation_probability: number[]; snowfall: number[] };
  daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; sunrise?: string[]; sunset?: string[] };
};

type Alert = { id: number; event_en: string | null; headline_en: string | null; severity: string; onset: string; expires: string | null };

export const weatherKey = ["weather"];

export function Weather() {
  const { data, isError } = useQuery({
    queryKey: weatherKey,
    queryFn: async () => {
      const r = await fetch(URL);
      if (!r.ok) throw new Error("Weather unavailable");
      return (await r.json()) as WeatherData;
    },
    refetchInterval: 10 * 60_000,
  });
  const { data: alerts } = useQuery({
    queryKey: ["weather-alerts"],
    queryFn: async () => {
      const r = await fetch("https://api.brightsky.dev/alerts?lat=48.137&lon=11.575");
      if (!r.ok) return [] as Alert[];
      return ((await r.json()) as { alerts: Alert[] }).alerts ?? [];
    },
    refetchInterval: 10 * 60_000,
  });
  const activeAlerts = (alerts ?? []).filter((a) => !a.expires || new Date(a.expires).getTime() > Date.now());

  if (!data) {
    return (
      <div className="glass flex items-center justify-center rounded-3xl p-6 text-muted-foreground">
        {isError ? "Weather unavailable" : "Loading weather…"}
      </div>
    );
  }
  const { Icon, label } = describe(data.current.weather_code);

  const today = data.daily.time[0] ?? "";
  const todayMax = Math.round(data.daily.temperature_2m_max[0] ?? 0);
  const todayMin = Math.round(data.daily.temperature_2m_min[0] ?? 0);
  const todayPrecip = data.daily.precipitation_probability_max[0] ?? 0;

  // Snow expected today if any remaining hour has snowfall or a snow weather code
  const todayStart = data.hourly.time.findIndex((t) => t.startsWith(today));
  // Current hour in Europe/Berlin, formatted like the API's local times ("2026-09-30T11")
  const berlinNow = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Berlin" }).replace(" ", "T").slice(0, 13);
  const nowHourIdx = data.hourly.time.findIndex((t) => t >= berlinNow);
  const fromIdx = Math.max(nowHourIdx, todayStart, 0);
  const remainingToday = data.hourly.time
    .map((t, i) => ({ t, i }))
    .filter(({ t, i }) => t.startsWith(today) && i >= fromIdx);
  const snowToday = remainingToday.some(({ i }) => (data.hourly.snowfall[i] ?? 0) > 0 || isSnowCode(data.hourly.weather_code[i] ?? 0));
  const rainToday = !snowToday && todayPrecip >= 30;

  // Next 8 hourly slots starting from the current hour
  const hours = remainingToday.slice(0, 8);

  return (
    <section className="glass flex flex-col justify-between gap-4 rounded-3xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">München</p>
          <p className="font-display text-7xl font-extralight leading-none">{Math.round(data.current.temperature_2m)}°</p>
          <p className="mt-1 text-lg text-muted-foreground">
            {label} · feels {Math.round(data.current.apparent_temperature)}°
          </p>
          <p className="mt-1 text-base text-muted-foreground">
            Today {todayMax}° / {todayMin}°
          </p>
        </div>
        <Icon className="h-24 w-24 shrink-0 text-accent" strokeWidth={1.2} />
      </div>

      {activeAlerts.map((a) => (
        <div key={a.id} className="flex items-start gap-2 rounded-2xl border border-destructive/60 bg-destructive/25 px-4 py-2.5 text-base">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <span>
            <span className="font-semibold">{a.headline_en ?? a.event_en ?? "Weather warning"}</span>
            {a.expires && (
              <span className="text-muted-foreground">
                {" "}· until {new Date(a.expires).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" })}
              </span>
            )}
          </span>
        </div>
      ))}

      {(rainToday || snowToday) && (
        <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-4 py-2.5 text-base">
          {snowToday ? <Snowflake className="h-5 w-5 text-accent" /> : <Umbrella className="h-5 w-5 text-accent" />}
          <span>
            {snowToday ? "Snow expected today" : `Rain likely today (${todayPrecip}%)`}
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
        <span className="flex items-center gap-1.5"><Wind className="h-4 w-4" />{Math.round(data.current.wind_speed_10m)} km/h</span>
        <span className="flex items-center gap-1.5"><Droplets className="h-4 w-4" />{data.current.relative_humidity_2m}%</span>
        {data.daily.sunrise?.[0] && <span className="flex items-center gap-1.5"><Sunrise className="h-4 w-4" />{data.daily.sunrise?.[0].slice(11, 16)}</span>}
        {data.daily.sunset?.[0] && <span className="flex items-center gap-1.5"><Sunset className="h-4 w-4" />{data.daily.sunset?.[0].slice(11, 16)}</span>}
      </div>

      {hours.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {hours.map(({ t, i }) => {
            const { Icon: HI } = describe(data.hourly.weather_code[i] ?? 0);
            const precip = data.hourly.precipitation_probability[i] ?? 0;
            return (
              <div key={t} className="flex min-w-[52px] flex-1 flex-col items-center rounded-xl bg-muted/40 py-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <HI className="my-1 h-5 w-5" strokeWidth={1.5} />
                <span className="text-sm">{Math.round(data.hourly.temperature_2m[i] ?? 0)}°</span>
                {precip >= 20 && (
                  <span className="text-[10px] text-accent">{precip}%</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {data.daily.time.slice(1, 4).map((d, i) => {
          const { Icon: DI } = describe(data.daily.weather_code[i + 1] ?? 0);
          return (
            <div key={d} className="flex flex-col items-center rounded-2xl bg-muted/60 py-3">
              <span className="text-sm text-muted-foreground">
                {new Date(d + "T12:00").toLocaleDateString("en-GB", { weekday: "short" })}
              </span>
              <DI className="my-1 h-7 w-7" strokeWidth={1.5} />
              <span className="text-base">
                {Math.round(data.daily.temperature_2m_max[i + 1] ?? 0)}°{" "}
                <span className="text-muted-foreground">{Math.round(data.daily.temperature_2m_min[i + 1] ?? 0)}°</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
