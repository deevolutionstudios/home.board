import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Maximize, Minimize, Moon, Sun, ListTodo, ShoppingBasket, ImagePlus } from "lucide-react";
import boardBackground from "@/assets/board-background.jpg";
import { CalendarPanel } from "@/components/board/CalendarPanel";
import { Weather } from "@/components/board/Weather";
import { ListPanel } from "@/components/board/ListPanel";
import { useBoardItems } from "@/components/board/useBoardItems";
import { usePhotos } from "@/components/board/usePhotos";
import { PhotosPanel } from "@/components/board/PhotosPanel";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home Board — Family Wall Display" },
      { name: "description", content: "Time, Google Calendar, chores, groceries and Munich weather on one glass wall display." },
      { property: "og:title", content: "Home Board — Family Wall Display" },
      { property: "og:description", content: "Time, calendar, chores, groceries and weather for the whole family." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Board,
});

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="h-24 lg:h-40" />;
  return (
    <div>
      <p className="font-display text-7xl sm:text-8xl lg:text-[9rem] font-extralight leading-none tracking-tight tabular-nums">
        {now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        <span className="ml-2 text-3xl lg:ml-3 lg:text-5xl text-muted-foreground">{String(now.getSeconds()).padStart(2, "0")}</span>
      </p>
      <p className="mt-2 font-display text-xl sm:text-2xl lg:mt-3 lg:text-4xl font-light text-muted-foreground">
        {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
      </p>
    </div>
  );
}

function CtrlButton({ onClick, label, children, active, disabled }: { onClick: () => void; label: string; children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`flex h-14 min-w-14 flex-1 flex-col sm:h-16 sm:w-16 sm:flex-none items-center justify-center gap-1 rounded-lg px-1 text-xs transition active:scale-95 [&_svg]:size-6 ${
        active ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"
      }`}
    >
      {children}
      <span>{label}</span>
    </Button>
  );
}

function Board() {
  const board = useBoardItems();
  const [night, setNight] = useState(false);
  const [full, setFull] = useState(false);
  const photoSet = usePhotos();
  const [photosOpen, setPhotosOpen] = useState(false);
  const background = photoSet.current?.url ?? boardBackground;

  useEffect(() => {
    const h = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const todos = board.items.filter((i) => i.list === "todo");
  const groceries = board.items.filter((i) => i.list === "grocery");

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="fixed inset-0 transition-[filter] duration-700"
        style={{ filter: night ? "brightness(0.35) saturate(0.6)" : undefined }}
      >
        <img key={background} src={background} alt="" className="h-full w-full object-cover animate-[fadein_1.2s_ease]" />
        <div className="absolute inset-0 bg-background/55" />
      </div>
      <div
        className="relative mx-auto flex min-h-screen w-full max-w-[1080px] flex-col gap-4 p-4 pb-8 sm:gap-5 sm:p-6 lg:gap-6 lg:p-8 transition-[filter] duration-700"
        style={{ filter: night ? "brightness(0.35) saturate(0.6)" : undefined }}
      >
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <Clock />
          <div className="flex gap-2 sm:gap-3" aria-label="Display controls">
            <CtrlButton onClick={() => setPhotosOpen(true)} label="Photos">
              <ImagePlus />
            </CtrlButton>
            <CtrlButton onClick={() => setNight((n) => !n)} label={night ? "Day" : "Night"} active={night}>
              {night ? <Sun /> : <Moon />}
            </CtrlButton>
            <CtrlButton onClick={toggleFull} label={full ? "Exit" : "Full"}>
              {full ? <Minimize /> : <Maximize />}
            </CtrlButton>
          </div>
        </header>
        <Weather />

        <div className="order-last min-h-0 md:order-none"><CalendarPanel /></div>
        <div aria-hidden className="min-h-6 flex-1" />
        <div className="grid min-h-0 gap-4 sm:gap-5 md:grid-cols-2 lg:gap-6 [&>section]:max-h-[65vh]">
          <ListPanel title="To-do" icon={<ListTodo className="h-6 w-6" />} list="todo" items={todos}
            onAdd={board.add} onToggle={board.toggle} onRemove={board.remove} onClearDone={board.clearDone} />
          <ListPanel title="Groceries" icon={<ShoppingBasket className="h-6 w-6" />} list="grocery" items={groceries}
            onAdd={board.add} onToggle={board.toggle} onRemove={board.remove} onClearDone={board.clearDone} />
        </div>
      </div>

      {photosOpen && (
        <PhotosPanel photos={photoSet.photos} onAdd={photoSet.add} onRemove={photoSet.remove} onClose={() => setPhotosOpen(false)} />
      )}

      {night && (
        <Button variant="ghost" aria-label="Wake display" onClick={() => setNight(false)} className="fixed inset-0 z-20 h-auto w-full cursor-default rounded-none" />
      )}
    </main>
  );
}
