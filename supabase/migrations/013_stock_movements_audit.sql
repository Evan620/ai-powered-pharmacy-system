-- Stock Movement/Audit infra

-- Main stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty integer NOT NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUST', 'RETURN')),
  reason text,
  linked_id uuid,
  performed_by uuid REFERENCES profiles(id),
  performed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id ON stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_performed_by ON stock_movements(performed_by);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);

-- Function to auto-log OUTs from sales
CREATE OR REPLACE FUNCTION log_sale_stock_movement()
RETURNS trigger AS $$
BEGIN
  INSERT INTO stock_movements (batch_id, product_id, qty, movement_type, reason, linked_id, performed_by, performed_at)
  VALUES (
    NEW.batch_id, NEW.product_id, NEW.qty * -1, 'OUT', 'Sale', NEW.sale_id, (SELECT cashier_id FROM sales WHERE id = NEW.sale_id), now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to sale_items insert
DROP TRIGGER IF EXISTS trg_log_sale_stock_movement ON sale_items;
CREATE TRIGGER trg_log_sale_stock_movement
AFTER INSERT ON sale_items
FOR EACH ROW
EXECUTE FUNCTION log_sale_stock_movement();

-- FUTURE (for purchases, returns, adjustments):
-- Create similar triggers/functions for purchase_items or manual stock adjustments.

GRANT SELECT, INSERT, UPDATE ON stock_movements TO authenticated, service_role;
