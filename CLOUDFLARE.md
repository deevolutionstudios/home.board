# Hosting the Home Board on Cloudflare (free)

The board needs a host that can run a small amount of server code (for the
calendar), not just plain file hosting. Cloudflare's free tier handles this.

---

## Route A — Deploy via the Cloudflare dashboard (recommended, no tools to install)

### 1. Create a Cloudflare account
- Go to dash.cloudflare.com and sign up (free).

### 2. Put the project on GitHub
1. Create a free account at github.com, then click **New repository**,
   name it e.g. `home-board`, keep it **Private**, and click **Create**.
2. Unzip `home-board-source.zip` on your computer.
3. On the GitHub repo page, click **uploading an existing file**, drag in ALL
   the files and folders from the unzipped folder (hidden files like `.env`
   may need to be enabled in your file browser), then click **Commit**.
   - If the upload refuses because the total is too big, use the
     "Add file → Upload files" flow again for the `src` folder separately —
     or ask me for a version without the zip's largest folders.
   - Do **not** upload `node_modules` or `dist` if present.

### 3. Create the Cloudflare project
1. In the Cloudflare dashboard: **Compute (Workers) → Create** → pick
   **Import an existing repository** → **GitHub** → authorize and select
   `home-board`.
2. Project name: `home-board` (you get `home-board.<yourname>.workers.dev`).
3. Build settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
4. Click **Deploy**. First build takes a few minutes.

### 4. Test it
Open `https://home-board.<yourname>.workers.dev`. Clock, weather, lists and
the background photo all work immediately. The calendar is empty until the
"Calendar on your own hosting" step below.

### 5. Put it on board.laufwerk.studio
1. In hPanel → your domain → **DNS / Name Servers**, add a **CNAME record**:
   - Name: `board`  •  Points to: `home-board.<yourname>.workers.dev`
2. In Cloudflare: your **home-board** Worker → **Settings → Domains & Routes →
   Add** → **Custom domain** → enter `board.laufwerk.studio` → Confirm.
3. Wait for the green check (usually minutes, up to a few hours).

---

## Route B — Deploy from your own computer (uses the command line)

```bash
# one-time: install Node 22 from nodejs.org
npm install
npm run build
npx wrangler login     # opens the browser to log in to Cloudflare
npx wrangler deploy
```

Then do step 5 above for the custom domain.

---

## Updating later

- **Route A:** after I make changes in Lovable, ask me for a fresh
  `home-board-source.zip`, replace the files on GitHub, and Cloudflare
  rebuilds automatically (or push a commit).
- **Route B:** re-run `npm run build && npx wrangler deploy`.

---

## Calendar on your own hosting

Outside Lovable, the calendar panel needs your own free Google API key
(~15 minutes, console.cloud.google.com: create a project → enable
**Google Calendar API** → Credentials → API key). Then either:

- add `GOOGLE_CALENDAR_API_KEY="..."` to `.env` and re-deploy — **and** ask me
  to switch the calendar code from Lovable's connection gateway to reading
  your key directly (one small change I can make before you deploy), or
- keep the board on Lovable hosting, where the calendar works with no setup.

Everything else (clock, weather, to-do & grocery lists, background photo,
night mode, fullscreen) works on Cloudflare out of the box — the lists and
photo live in the Lovable Cloud backend, which your board talks to over the
internet either way.

The page is already marked so search engines won't list it.
