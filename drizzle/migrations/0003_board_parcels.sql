CREATE TABLE public.board_parcels (
  id uuid not null default gen_random_uuid(),
  carrier text not null default 'other',
  tracking_number text not null default '',
  label text not null default '',
  expected_date date,
  arrived boolean not null default false,
  created_at timestamptz not null default now(),
  CONSTRAINT board_parcels_carrier_check CHECK (carrier IN ('dhl','hermes','dpd','gls','amazon','other'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_parcels TO anon, authenticated;
GRANT ALL ON public.board_parcels TO service_role;

ALTER TABLE public.board_parcels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parcels read" ON public.board_parcels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "parcels insert" ON public.board_parcels FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "parcels update" ON public.board_parcels FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "parcels delete" ON public.board_parcels FOR DELETE TO anon, authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.board_parcels;