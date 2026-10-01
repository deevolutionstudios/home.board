# Roadmap

## Done
- Portrait wall layout + mobile reflow
- Background photo upload (shared via board-backgrounds bucket)
- Hourly weather, past hours filtered (Europe/Berlin)
- Removed top Add/Sync buttons; lists anchor at bottom via flex spacer
- Smaller list item text (text-base sm:text-lg)
- noindex meta added to / so the board stays unlisted
- Night wake layer stays transparent instead of showing the accent color
- Removed manual completion circles from parcels and lists; X now removes rows directly while parcel progress remains automatic
- Restored Refresh and Night controls; display night mode is manual and persists per device, with no automatic schedule
- Parcel rows wrap full labels and keep the carrier and expected date visible on mobile

## Open
- Host the board at laufwerk.studio — waiting on user decision: point a subdomain at Lovable hosting vs. self-host the code on their own infrastructure. Publish was declined earlier; nothing is live yet.
- [x] Parcels panel: built and verified — free-text note (label) shown with tracking number, carrier chip, expected-date status, arrived toggle
