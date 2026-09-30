ALTER TABLE public.board_parcels
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS status_detail text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS registered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checked_at timestamptz;