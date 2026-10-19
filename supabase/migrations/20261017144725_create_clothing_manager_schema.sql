/*
# Asifa's Clothing Manager — initial schema

## Overview
Single-tenant app (no sign-in) for managing clothing inventory and calculating
selling prices with a configurable profit percentage. Data is intentionally
shared/public so the anon-key frontend can read and write everything.

## New Tables

### categories
- `id` (uuid, PK)
- `name` (text, not null) — e.g. "3-Piece Suits", "Lawn Suits"
- `created_at` (timestamptz, default now())

### items
- `id` (uuid, PK)
- `name` (text, not null) — e.g. "3-Piece Suit", "Fancy Dress"
- `category_id` (uuid, FK -> categories.id ON DELETE SET NULL)
- `image` (text) — base64 data URL of uploaded photo (nullable)
- `actual_price` (numeric(12,2), not null) — purchase price in PKR
- `percentage` (numeric(5,2), not null, default 0) — profit percentage
- `notes` (text, nullable)
- `created_at` (timestamptz, default now())

### settings
- `id` (int, PK, always 1) — singleton row
- `default_percentage` (numeric(5,2), not null, default 25) — auto-fills new items

## Security
- RLS enabled on all three tables.
- All policies scope TO anon, authenticated with USING/WITH CHECK (true) because
  this is a single-tenant app with no sign-in — the data is intentionally public.
- categories, items, settings each get 4 CRUD policies.

## Notes
1. Selling price is calculated in the app: actual_price + (actual_price * percentage / 100).
   It is NOT stored in the database.
2. Images are stored as base64 data URLs in the items.image text column.
3. A singleton settings row (id=1) is seeded with a 25% default percentage.
4. Example categories are NOT seeded — the user creates their own.
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image text,
  actual_price numeric(12,2) NOT NULL DEFAULT 0,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_items" ON items;
CREATE POLICY "anon_select_items" ON items FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_items" ON items;
CREATE POLICY "anon_insert_items" ON items FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_items" ON items;
CREATE POLICY "anon_update_items" ON items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_items" ON items;
CREATE POLICY "anon_delete_items" ON items FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_percentage numeric(5,2) NOT NULL DEFAULT 25
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

INSERT INTO settings (id, default_percentage)
VALUES (1, 25)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
