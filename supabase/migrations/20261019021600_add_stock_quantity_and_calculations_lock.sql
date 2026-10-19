ALTER TABLE items
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'items'::regclass
      AND conname = 'items_quantity_nonnegative'
  ) THEN
    ALTER TABLE items
      ADD CONSTRAINT items_quantity_nonnegative CHECK (quantity >= 0);
  END IF;
END;
$$;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

GRANT UPDATE (quantity) ON items TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'sales'::regclass
      AND conname = 'sales_quantity_positive'
  ) THEN
    ALTER TABLE sales
      ADD CONSTRAINT sales_quantity_positive CHECK (quantity > 0);
  END IF;
END;
$$;

ALTER TABLE sales DROP COLUMN IF EXISTS profit;
ALTER TABLE sales
  ADD COLUMN profit numeric(12, 2)
  GENERATED ALWAYS AS ((sale_price - cost_price) * quantity) STORED;

CREATE OR REPLACE FUNCTION set_sale_item_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE items
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.item_id
    AND quantity >= NEW.quantity
  RETURNING name, actual_price INTO NEW.item_name, NEW.cost_price;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not enough stock available. Refresh the clothing list and try again.';
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
