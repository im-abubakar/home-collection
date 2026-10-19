-- Require the designated Supabase Auth account for every inventory operation.
DROP POLICY IF EXISTS "anon_select_categories" ON categories;
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;

CREATE POLICY "asifa_select_categories" ON categories FOR SELECT
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
CREATE POLICY "asifa_insert_categories" ON categories FOR INSERT
  TO authenticated
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
CREATE POLICY "asifa_update_categories" ON categories FOR UPDATE
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
CREATE POLICY "asifa_delete_categories" ON categories FOR DELETE
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');

DROP POLICY IF EXISTS "anon_select_items" ON items;
DROP POLICY IF EXISTS "anon_insert_items" ON items;
DROP POLICY IF EXISTS "anon_update_items" ON items;
DROP POLICY IF EXISTS "anon_delete_items" ON items;

CREATE POLICY "asifa_select_items" ON items FOR SELECT
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
CREATE POLICY "asifa_insert_items" ON items FOR INSERT
  TO authenticated
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
CREATE POLICY "asifa_update_items" ON items FOR UPDATE
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
CREATE POLICY "asifa_delete_items" ON items FOR DELETE
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
DROP POLICY IF EXISTS "anon_update_settings" ON settings;
DROP POLICY IF EXISTS "anon_delete_settings" ON settings;

CREATE POLICY "asifa_select_settings" ON settings FOR SELECT
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
CREATE POLICY "asifa_insert_settings" ON settings FOR INSERT
  TO authenticated
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
CREATE POLICY "asifa_update_settings" ON settings FOR UPDATE
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com')
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
CREATE POLICY "asifa_delete_settings" ON settings FOR DELETE
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');
