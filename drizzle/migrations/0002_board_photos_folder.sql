DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND (qual ILIKE '%board-backgrounds%' OR with_check ILIKE '%board-backgrounds%') LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP; END $$;
CREATE POLICY "board photos read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'board-backgrounds');
CREATE POLICY "board photos add" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'board-backgrounds' AND (name = 'background' OR name LIKE 'photo-%'));
CREATE POLICY "board photos update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'board-backgrounds' AND (name = 'background' OR name LIKE 'photo-%')) WITH CHECK (bucket_id = 'board-backgrounds' AND (name = 'background' OR name LIKE 'photo-%'));
CREATE POLICY "board photos remove" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'board-backgrounds' AND (name = 'background' OR name LIKE 'photo-%'));