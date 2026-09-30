<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the wall board in a portrait-first, vertically scrolling layout even on wide screens, because the household display is portrait-mounted.
- Store shared background photos as `photo-*` objects (plus legacy `background`), cycled every 5 minutes, in the private `board-backgrounds` bucket with scoped anonymous storage policies, because the board is intentionally available without sign-in and family devices need the same image.
- Track household parcels in `board_parcels` (open RLS like `board_items`): manual add of carrier/label/tracking number/expected date with one-tap carrier tracking links. Live carrier status is not publicly available (DHL/Hermes/DPD/GLS/America APIs need registered keys); a Gmail reader for auto-adding parcels is a planned follow-up.
