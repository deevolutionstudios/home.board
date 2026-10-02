import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const Body = z.object({
  secret: z.string().min(1).max(256),
  action: z.enum(["add", "remove", "clear", "read"]),
  list: z.enum(["todo", "grocery"]),
  text: z.string().max(400).optional(),
});

function boardClient() {
  const key = (process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "sb_publishable_t0gDwwFDcK3b8sokpbNiBw_oYRaJw8c") as string;
  return createClient<Database>((process.env["SUPABASE_URL"] ?? "https://nfktzfzpqcicnsrcgqjg.supabase.co") as string, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Split "milk, eggs and bread" into separate items.
function splitItems(text: string): string[] {
  return text
    .split(/,| and /i)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.slice(0, 200));
}

export const Route = createFileRoute("/api/public/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["VOICE_SECRET"];
        if (!expected) return Response.json({ error: "Voice commands not configured" }, { status: 503 });

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return Response.json({ error: "Bad request" }, { status: 400 });
        }
        // Tolerate stray spaces and iPhone "smart" punctuation in the shortcut.
        const norm = (s: string) =>
          s.normalize("NFKC").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, "-").trim();
        if (norm(body.secret) !== norm(expected)) {
          return Response.json(
            { error: "Wrong secret", hint: `Your phone sent ${norm(body.secret).length} characters; the board expects ${norm(expected).length}.` },
            { status: 401 },
          );
        }

        const supabase = boardClient();

        if (body.action === "add") {
          const items = splitItems(body.text ?? "");
          if (items.length === 0) return Response.json({ error: "Nothing to add" }, { status: 400 });
          const { error } = await supabase.from("board_items").insert(items.map((text) => ({ list: body.list, text })));
          if (error) return Response.json({ error: error.message }, { status: 500 });
          return Response.json({ ok: true, added: items });
        }

        if (body.action === "remove") {
          const needle = (body.text ?? "").trim().toLowerCase();
          if (!needle) return Response.json({ error: "Nothing to remove" }, { status: 400 });
          const { data } = await supabase.from("board_items").select("id, text").eq("list", body.list);
          const matches = (data ?? []).filter((i) => i.text.toLowerCase().includes(needle));
          if (matches.length === 0) return Response.json({ ok: true, removed: [], message: `Nothing matching "${body.text}" on the list` });
          const { error } = await supabase.from("board_items").delete().in("id", matches.map((m) => m.id));
          if (error) return Response.json({ error: error.message }, { status: 500 });
          return Response.json({ ok: true, removed: matches.map((m) => m.text) });
        }

        if (body.action === "clear") {
          const { error } = await supabase.from("board_items").delete().eq("list", body.list);
          if (error) return Response.json({ error: error.message }, { status: 500 });
          return Response.json({ ok: true, cleared: body.list });
        }

        // read
        const { data } = await supabase.from("board_items").select("text").eq("list", body.list).order("created_at");
        const items = (data ?? []).map((i) => i.text);
        return Response.json({ ok: true, items, count: items.length });
      },
    },
  },
});
