CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  cost_price numeric(12, 2) NOT NULL,
  sale_price numeric(12, 2) NOT NULL CHECK (sale_price > 0),
  profit numeric(12, 2) GENERATED ALWAYS AS (sale_price - cost_price) STORED,
  sold_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "asifa_select_sales" ON sales;
CREATE POLICY "asifa_select_sales" ON sales FOR SELECT
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');

DROP POLICY IF EXISTS "asifa_insert_sales" ON sales;
CREATE POLICY "asifa_insert_sales" ON sales FOR INSERT
  TO authenticated
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');

GRANT SELECT, INSERT ON sales TO authenticated;

CREATE OR REPLACE FUNCTION set_sale_item_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  SELECT name, actual_price
  INTO NEW.item_name, NEW.cost_price
  FROM items
  WHERE id = NEW.item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected clothing item does not exist or is not accessible.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sale_item_snapshot_before_insert ON sales;
CREATE TRIGGER set_sale_item_snapshot_before_insert
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION set_sale_item_snapshot();

CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_item_id ON sales(item_id);

NOTIFY pgrst, 'reload schema';
