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

const GOOGLE_API = "https://www.googleapis.com/calendar/v3";
const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

type CalendarRef = { id: string; summary: string; backgroundColor?: string };

function b64url(input: string | Uint8Array): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function serviceAccountToken(rawJson: string): Promise<string> {
  let json: { client_email?: string; private_key?: string };
  try {
    json = JSON.parse(rawJson);
  } catch {
    try {
      json = JSON.parse(atob(rawJson.trim()));
    } catch {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON (or base64-encoded JSON)");
    }
  }
  if (!json.client_email || !json.private_key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: json.client_email,
      scope: CALENDAR_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );

  const pem = json.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(`${header}.${claims}`));
  const assertion = `${header}.${claims}.${b64url(new Uint8Array(sig))}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed [${res.status}]: ${await res.text()}`);
  const token = (await res.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("Google token exchange returned no access token");
  return token.access_token;
}

async function loadCalendars(headers: Record<string, string>, base: string): Promise<CalendarRef[]> {
  const idsEnv = process.env["GOOGLE_CALENDAR_IDS"];
  if (idsEnv?.trim()) {
    const ids = idsEnv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    const refs = await Promise.all(
      ids.map(async (id): Promise<CalendarRef | null> => {
        const r = await fetch(`${base}/calendars/${encodeURIComponent(id)}`, { headers });
        if (!r.ok) {
          console.error(`Calendar ${id} failed [${r.status}]: ${await r.text()}`);
          return null;
        }
        const c = (await r.json()) as { id?: string; summary?: string; backgroundColor?: string };
        return { id: c.id ?? id, summary: c.summary ?? id, ...(c.backgroundColor ? { backgroundColor: c.backgroundColor } : {}) };
      }),
    );
    return refs.filter((c): c is CalendarRef => c !== null);
  }

  const r = await fetch(`${base}/users/me/calendarList`, { headers });
  if (!r.ok) throw new Error(`Calendar list failed [${r.status}]: ${await r.text()}`);
  const list = (await r.json()) as {
    items?: { id: string; summary: string; backgroundColor?: string; selected?: boolean }[];
  };
  return (list.items ?? [])
    .filter((c) => c.selected !== false)
    .slice(0, 10)
    .map((c) => ({ id: c.id, summary: c.summary, ...(c.backgroundColor ? { backgroundColor: c.backgroundColor } : {}) }));
}

export const getUpcomingEvents = createServerFn({ method: "GET" }).handler(async () => {
  const saJson = process.env["GOOGLE_SERVICE_ACCOUNT_JSON"];
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const calKey = process.env["GOOGLE_CALENDAR_API_KEY"];

  // Self-hosted: sign in as a Google service account (a private key you paste
  // into the Cloudflare worker's secrets — never committed to GitHub).
  let base = GOOGLE_API;
  let headers: Record<string, string>;
  if (saJson) {
    const token = await serviceAccountToken(saJson);
    headers = { Authorization: `Bearer ${token}` };
  } else if (lovableKey && calKey) {
    // Lovable preview/hosting: keep using the managed connection gateway.
    base = GATEWAY;
    headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": calKey };
  } else {
    throw new Error("Google Calendar is not set up yet on this hosting");
  }

  const calendars = await loadCalendars(headers, base);

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
      const r = await fetch(`${base}/calendars/${encodeURIComponent(c.id)}/events?${qs}`, { headers });
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
