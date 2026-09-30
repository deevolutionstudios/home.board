import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BoardList = "todo" | "grocery";
export type BoardItem = { id: string; list: string; text: string; done: boolean; created_at: string };

export function useBoardItems() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("board_items")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) setError(error.message);
    else {
      setError(null);
      setItems(data ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("board_items")
      .on("postgres_changes", { event: "*", schema: "public", table: "board_items" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const add = async (list: BoardList, text: string) => {
    const t = text.trim().slice(0, 200);
    if (!t) return;
    const temp: BoardItem = { id: `tmp-${Date.now()}`, list, text: t, done: false, created_at: new Date().toISOString() };
    setItems((p) => [...p, temp]);
    await supabase.from("board_items").insert({ list, text: t });
    load();
  };
  const toggle = async (item: BoardItem) => {
    setItems((p) => p.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)));
    await supabase.from("board_items").update({ done: !item.done }).eq("id", item.id);
  };
  const remove = async (id: string) => {
    setItems((p) => p.filter((i) => i.id !== id));
    await supabase.from("board_items").delete().eq("id", id);
  };
  const clearDone = async (list: BoardList) => {
    setItems((p) => p.filter((i) => !(i.list === list && i.done)));
    await supabase.from("board_items").delete().eq("list", list).eq("done", true);
  };

  return { items, error, add, toggle, remove, clearDone, reload: load };
}
