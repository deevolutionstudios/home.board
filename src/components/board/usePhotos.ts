import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "board-backgrounds";
const CYCLE_MS = 5 * 60_000;
const SIGN_TTL = 60 * 60 * 24; // 24h
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024;

export type Photo = { name: string; url: string };

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const cache = useRef(new Map<string, { url: string; at: number }>());

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.storage.from(BUCKET).list("", { limit: 500, sortBy: { column: "created_at", order: "asc" } });
    if (error || !data) return;
    const names = data.filter((f) => f.id && (f.name === "background" || f.name.startsWith("photo-"))).map((f) => f.name);
    const now = Date.now();
    const stale = names.filter((n) => { const c = cache.current.get(n); return !c || now - c.at > (SIGN_TTL * 1000) / 2; });
    if (stale.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(stale, SIGN_TTL);
      signed?.forEach((s) => { if (s.path && s.signedUrl) cache.current.set(s.path, { url: s.signedUrl, at: now }); });
    }
    setPhotos(names.flatMap((n) => { const c = cache.current.get(n); return c ? [{ name: n, url: c.url }] : []; }));
  }, []);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (photos.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => i + 1), CYCLE_MS);
    return () => window.clearInterval(t);
  }, [photos.length]);

  const add = async (files: File[]) => {
    const bad = files.filter((f) => !f.type.startsWith("image/") || f.size > MAX_PHOTO_BYTES);
    const good = files.filter((f) => !bad.includes(f));
    let failed = 0;
    for (const f of good) {
      const name = `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { error } = await supabase.storage.from(BUCKET).upload(name, f, { contentType: f.type, cacheControl: "3600" });
      if (error) failed++;
    }
    await refresh();
    if (bad.length) return `${bad.length} file(s) skipped — only images under 25 MB.`;
    if (failed) return `${failed} photo(s) couldn't be saved. Please try again.`;
    return "";
  };

  const remove = async (name: string) => {
    const { error } = await supabase.storage.from(BUCKET).remove([name]);
    cache.current.delete(name);
    await refresh();
    return error ? "Photo couldn't be removed. Please try again." : "";
  };

  const current = photos.length ? photos[index % photos.length] : undefined;
  return { photos, current, add, remove, next: () => setIndex((i) => i + 1) };
}
