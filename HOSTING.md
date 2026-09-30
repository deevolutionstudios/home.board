# Hosting the Home Board on your own infrastructure

This project is a **TanStack Start** app. That means it is *not* a folder of
static files: it runs a small server (that is what fetches your Google
Calendar). Any host must run that server part — a plain "upload HTML files"
web host will not work.

## What keeps working when you self-host

- Clock, date, to-do & grocery lists, background photo, weather (Open-Meteo),
  night mode, fullscreen — all fine.
- The **data lives in Lovable Cloud** (the lists database and the background
  photo bucket). You do **not** need to move or re-create it. The app talks to
  it over HTTPS from wherever it is hosted.

## What needs attention

- **Google Calendar**: the server function uses two keys that are managed
  inside Lovable (`LOVABLE_API_KEY` and the Google connector key). Their values
  are not exportable. Self-hosted, the calendar panel will show nothing until
  you either (a) keep the app on Lovable hosting, or (b) set up your own Google
  Cloud OAuth credentials and replace the gateway calls.
- **Environment variables** (not secret, safe to commit): copy them from the
  project's `.env` in the Lovable code editor:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`

## Build & run

```bash
npm install        # Node 22
npm run build      # auto-detects Vercel / Netlify / Cloudflare Pages
```

For a plain Node server (e.g. a VPS), tell Nitro to emit a Node output:

```ts
// vite.config.ts
export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  vite: { nitro: { preset: "node-server" } },
});
```

then run `node dist/server/index.mjs` behind your reverse proxy of choice
(Nginx/Caddy for TLS).

## Hostinger notes

- Hostinger **shared / Premium / Business web hosting** serves static files and
  PHP only — it cannot run this app as-is.
- Hostinger **VPS** plans can run Node.js (install Node 22, `npm ci`, build,
  run with `pm2`, point Nginx at it).
- Easiest hybrid: deploy free on Cloudflare Pages / Netlify / Vercel from the
  same repository, then add a DNS record in hPanel pointing
  `board.laufwerk.studio` at it. You keep your domain; no VPS to maintain.

## Staying hidden

The app ships with `robots: noindex, nofollow` meta on the board page, so
search engines will not list it. Anyone who knows the URL can still view and
edit the lists (the board is intentionally login-free).
