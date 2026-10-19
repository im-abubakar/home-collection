DROP POLICY IF EXISTS "asifa_delete_sales" ON sales;
CREATE POLICY "asifa_delete_sales" ON sales FOR DELETE
  TO authenticated
  USING (lower(auth.jwt() ->> 'email') = 'bakarbro123@gmail.com');

GRANT DELETE ON sales TO authenticated;

CREATE OR REPLACE FUNCTION restore_stock_after_sale_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.item_id IS NOT NULL THEN
    UPDATE items
    SET quantity = quantity + OLD.quantity
    WHERE id = OLD.item_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS restore_stock_after_sale_delete ON sales;
CREATE TRIGGER restore_stock_after_sale_delete
  AFTER DELETE ON sales
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_after_sale_delete();
