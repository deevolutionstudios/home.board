import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Photo } from "./usePhotos";

export function PhotosPanel({ photos, onAdd, onRemove, onClose }: {
  photos: Photo[];
  onAdd: (files: File[]) => Promise<string>;
  onRemove: (name: string) => Promise<string>;
  onClose: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <div role="dialog" aria-modal="true" aria-label="Photos" className="fixed inset-0 z-30 flex items-end justify-center bg-background/70 p-4 sm:items-center" onClick={onClose}>
      <div className="glass flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-light">Photos</h2>
            <p className="text-sm text-muted-foreground">{photos.length} in the slideshow · changes every 5 minutes</p>
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Close" className="h-14 w-14 [&_svg]:size-6"><X /></Button>
        </div>
        <input ref={input} type="file" accept="image/*" multiple className="hidden" aria-label="Choose photos"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!files.length) return;
            setBusy(true); setMessage("");
            setMessage(await onAdd(files));
            setBusy(false);
          }} />
        <Button onClick={() => input.current?.click()} disabled={busy} className="h-14 gap-2 text-base [&_svg]:size-6">
          <ImagePlus /> {busy ? "Saving…" : "Add photos"}
        </Button>
        {message && <p role="alert" className="text-sm text-destructive">{message}</p>}
        <div className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.name} className="relative aspect-[3/4] overflow-hidden rounded-xl">
              <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              <Button variant="ghost" aria-label="Remove photo" disabled={busy}
                onClick={async () => { setBusy(true); setMessage(await onRemove(p.name)); setBusy(false); }}
                className="glass absolute right-2 top-2 h-12 w-12 rounded-full [&_svg]:size-5"><X /></Button>
            </div>
          ))}
          {!photos.length && <p className="col-span-full py-8 text-center text-muted-foreground">No photos yet — add a few.</p>}
        </div>
      </div>
    </div>
  );
}
