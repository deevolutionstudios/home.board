// Copies the Google settings saved under Cloudflare "Builds → Variables and secrets"
// into the running Worker as runtime secrets. Runs only inside Cloudflare Workers Builds
// (WORKERS_CI=1); everywhere else it does nothing. Never prints secret values.
import { execFileSync } from "node:child_process";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NAMES = ["GOOGLE_SERVICE_ACCOUNT_JSON", "GOOGLE_CALENDAR_IDS"];

if (process.env.WORKERS_CI !== "1") process.exit(0);

const secrets = {};
for (const name of NAMES) {
  const value = process.env[name];
  if (value && value.trim()) secrets[name] = value.trim();
}

const found = Object.keys(secrets);
if (found.length === 0) {
  console.log("[push-secrets] No Google settings found in build variables — skipping.");
  process.exit(0);
}

const file = join(tmpdir(), `cf-secrets-${Date.now()}.json`);
try {
  writeFileSync(file, JSON.stringify(secrets));
  console.log(`[push-secrets] Sending to the running board: ${found.join(", ")}`);
  execFileSync("npx", ["--yes", "wrangler", "secret", "bulk", file, "--name", "home-board"], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  console.log("[push-secrets] Done.");
} catch (err) {
  console.warn("[push-secrets] Could not send settings:", err instanceof Error ? err.message : err);
} finally {
  rmSync(file, { force: true });
}
