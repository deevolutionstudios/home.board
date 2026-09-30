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

Your family calendar is private, so a plain API key is not enough — the board
signs in as a Google **service account** that you share the calendar with.
Setup is free and takes ~15 minutes:

1. Go to **console.cloud.google.com**, sign in with your Google account, and
   create a project (name it e.g. `Home Board`).
2. **APIs & Services → Library** → search **Google Calendar API** → **Enable**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
   Name it e.g. `home-board`, skip the optional role steps, click **Done**.
4. Open the service account → **Keys** tab → **Add key → Create new key →
   JSON**. A `.json` file downloads — **keep it private** (never upload it to
   GitHub). Open it in a text editor and copy everything.
5. In **Google Calendar** (calendar.google.com) → your family calendar →
   **⋮ → Settings and sharing → Share with specific people** → add the service
   account's email (it ends in `@...iam.gserviceaccount.com`) with
   **See all event details** → Send.
6. In **Cloudflare** → your `home-board` Worker → **Settings → Variables and
   Secrets** → **Add**:
   - Type **Secret**, name `GOOGLE_SERVICE_ACCOUNT_JSON`, paste the JSON
     contents as the value.
   - (Optional) Type **Text**, name `GOOGLE_CALENDAR_IDS`, with a
     comma-separated list of the calendar IDs to show.
7. Redeploy the worker (Deployments → Retry deployment, or push any commit).

After that the calendar panel fills in on your own hosting, same as it does
here in Lovable. The calendar stays empty until steps 5 and 6 are both done.

Everything else (clock, weather, to-do & grocery lists, background photo,
night mode, fullscreen) works on Cloudflare out of the box — the lists and
photo live in the Lovable Cloud backend, which your board talks to over the
internet either way.

The page is already marked so search engines won't list it.
