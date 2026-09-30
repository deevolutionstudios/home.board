import { useState, type ReactNode } from "react";
import { Check, Plus, X } from "lucide-react";
import type { BoardItem, BoardList } from "./useBoardItems";

type Props = {
  title: string;
  icon: ReactNode;
  list: BoardList;
  items: BoardItem[];
  onAdd: (list: BoardList, text: string) => void;
  onToggle: (item: BoardItem) => void;
  onRemove: (id: string) => void;
  onClearDone: (list: BoardList) => void;
};

export const MAX_VISIBLE_ITEMS = 8;

export function ListPanel({ title, icon, list, items, onAdd, onToggle, onRemove, onClearDone }: Props) {
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(false);
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);
  const hiddenCount = Math.max(0, open.length - MAX_VISIBLE_ITEMS);
  const visibleOpen = showAll || hiddenCount === 0 ? open : open.slice(0, MAX_VISIBLE_ITEMS);

  // Text steps down as the list grows so a long list stays tidy on the wall.
  const textClass =
    items.length > 14 ? "text-xs sm:text-sm" : items.length > 8 ? "text-sm sm:text-base" : "text-base sm:text-lg";

  return (
    <section className="glass flex min-h-0 flex-col rounded-3xl p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-xl sm:text-2xl font-light tracking-wide">
          <span className="text-primary">{icon}</span>
          {title}
          <span className="rounded-full bg-secondary px-3 py-0.5 text-base text-muted-foreground">{open.length}</span>
        </h2>
        {done.length > 0 && (
          <button
            onClick={() => onClearDone(list)}
            className="rounded-full bg-secondary min-h-11 px-4 py-2 text-sm text-muted-foreground active:scale-95"
          >
            Clear {done.length} done
          </button>
        )}
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(list, text);
          setText("");
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={200}
          placeholder={list === "grocery" ? "Add groceries…" : "Add a task…"}
          className="h-14 min-w-0 flex-1 rounded-2xl border border-input bg-muted px-5 text-base sm:text-lg outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          aria-label="Add"
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </button>
      </form>

      <ul className="-mr-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-2">
        {[...visibleOpen, ...done].map((item) => (
          <li key={item.id} className="group flex items-center gap-3 rounded-2xl bg-muted/60 pl-2">
            <button
              onClick={() => onToggle(item)}
              className="flex min-h-14 min-w-0 flex-1 items-center gap-4 py-2 text-left"
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 transition ${
                  item.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50"
                }`}
              >
                {item.done && <Check className="h-5 w-5" />}
              </span>
              <span className={`truncate ${textClass} ${item.done ? "text-muted-foreground line-through" : ""}`}>
                {item.text}
              </span>
            </button>
            <button
              onClick={() => onRemove(item.id)}
              aria-label="Remove"
              className="grid h-14 w-14 shrink-0 place-items-center text-muted-foreground active:text-destructive"
            >
              <X className="h-5 w-5" />
            </button>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="pt-1">
            <button
              onClick={() => setShowAll((v) => !v)}
              className="min-h-11 w-full rounded-xl text-xs text-muted-foreground/70 active:scale-95"
            >
              {showAll ? "Show less" : `+ ${hiddenCount} more`}
            </button>
          </li>
        )}
        {items.length === 0 && <li className="py-8 text-center text-muted-foreground">Nothing here yet</li>}
      </ul>
    </section>
  );
}
