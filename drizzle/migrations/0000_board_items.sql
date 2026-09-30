CREATE TABLE public.board_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list text NOT NULL CHECK (list IN ('todo','grocery')),
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 200),
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.board_items TO anon, authenticated;
GRANT ALL ON public.board_items TO service_role;
ALTER TABLE public.board_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "household read" ON public.board_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "household insert" ON public.board_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "household update" ON public.board_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "household delete" ON public.board_items FOR DELETE TO anon, authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_items;
INSERT INTO public.board_items (list, text) VALUES
('todo','Take out recycling'),('todo','Water the plants'),('todo','Book dentist appointment'),
('grocery','Milk'),('grocery','Brezen'),('grocery','Apples'),('grocery','Coffee beans');