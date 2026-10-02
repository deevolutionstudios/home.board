import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BoardItem, BoardList } from "./useBoardItems";

type Props = {
  title: string;
  icon: ReactNode;
  list: BoardList;
  items: BoardItem[];
  onAdd: (list: BoardList, text: string) => void;
  onRemove: (id: string) => void;
  maxVisible?: number;
};

export const MAX_VISIBLE_ITEMS = 8;

export function ListPanel({ title, icon, list, items, onAdd, onRemove, maxVisible = MAX_VISIBLE_ITEMS }: Props) {
  const [text, setText] = useState("");
  const [showAll, setShowAll] = useState(false);
  const hiddenCount = Math.max(0, items.length - maxVisible);
  const visibleItems = showAll || hiddenCount === 0 ? items : items.slice(0, maxVisible);

  // Text steps down as the list grows so a long list stays tidy on the wall.
  const textClass =
    items.length > 14 ? "text-xs sm:text-sm" : items.length > 8 ? "text-sm sm:text-[15px]" : "text-base";

  return (
    <section className="glass flex min-h-0 flex-col rounded-3xl p-4 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-xl sm:text-2xl font-light tracking-wide">
          <span className="text-primary">{icon}</span>
          {title}
           <span className="rounded-full bg-secondary px-3 py-0.5 text-base text-muted-foreground">{items.length}</span>
        </h2>
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
         <Button
          type="submit"
          aria-label="Add"
           className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground active:scale-95 [&_svg]:size-7"
        >
          <Plus className="h-7 w-7" />
         </Button>
      </form>

      <ul className="-mr-2 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-2">
         {visibleItems.map((item) => (
           <li key={item.id} className="flex min-h-14 items-center gap-3 rounded-2xl bg-muted/60 pl-4">
             <span className={`min-w-0 flex-1 truncate ${textClass}`}>{item.text}</span>
             <Button
               type="button"
               variant="ghost"
              onClick={() => onRemove(item.id)}
               aria-label={`Remove ${item.text}`}
               title="Remove"
               className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-muted-foreground active:text-destructive"
            >
              <X className="h-5 w-5" />
             </Button>
          </li>
        ))}
        {hiddenCount > 0 && (
          <li className="pt-1">
             <Button
               type="button"
               variant="ghost"
              onClick={() => setShowAll((v) => !v)}
              className="min-h-11 w-full rounded-xl text-xs text-muted-foreground/70 active:scale-95"
            >
              {showAll ? "Show less" : `+ ${hiddenCount} more`}
             </Button>
          </li>
        )}
        {items.length === 0 && <li className="py-8 text-center text-muted-foreground">Nothing here yet</li>}
      </ul>
    </section>
  );
}
