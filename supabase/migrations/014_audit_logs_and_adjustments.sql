-- Create audit_logs table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ADJUST', 'SALE', 'PURCHASE', 'RETURN'
  entity TEXT NOT NULL, -- 'product', 'batch', 'sale', 'stock', etc.
  entity_id UUID NOT NULL,
  details JSONB, -- Store before/after values, reasons, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_pharmacy_id ON audit_logs(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Create stock_adjustments table for manual adjustments
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_before INTEGER NOT NULL,
  qty_after INTEGER NOT NULL,
  qty_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  performed_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for stock adjustments
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_pharmacy_id ON stock_adjustments(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_batch_id ON stock_adjustments(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_performed_by ON stock_adjustments(performed_by);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created_at ON stock_adjustments(created_at);

-- Function to perform stock adjustment with audit trail
CREATE OR REPLACE FUNCTION perform_stock_adjustment(
  p_batch_id UUID,
  p_new_qty INTEGER,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_batch RECORD;
  v_user_id UUID;
  v_pharmacy_id UUID;
  v_adjustment_id UUID;
  v_qty_change INTEGER;
BEGIN
  -- Get current user from JWT
  v_user_id := auth.uid();
  
  -- Get batch details and current quantity
  SELECT b.*, p.pharmacy_id INTO v_batch
  FROM batches b
  JOIN products p ON b.product_id = p.id
  WHERE b.id = p_batch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Batch not found');
  END IF;
  
  v_pharmacy_id := v_batch.pharmacy_id;
  v_qty_change := p_new_qty - v_batch.qty_available;
  
  -- Check if user has permission (manager or owner role)
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_user_id 
    AND pharmacy_id = v_pharmacy_id 
    AND role IN ('owner', 'manager')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Validate new quantity is not negative
  IF p_new_qty < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity cannot be negative');
  END IF;
  
  -- Create stock adjustment record
  INSERT INTO stock_adjustments (
    pharmacy_id, batch_id, product_id, qty_before, qty_after, 
    qty_change, reason, notes, performed_by
  ) VALUES (
    v_pharmacy_id, p_batch_id, v_batch.product_id, v_batch.qty_available, 
    p_new_qty, v_qty_change, p_reason, p_notes, v_user_id
  ) RETURNING id INTO v_adjustment_id;
  
  -- Update batch quantity
  UPDATE batches 
  SET qty_available = p_new_qty 
  WHERE id = p_batch_id;
  
  -- Create stock movement record
  INSERT INTO stock_movements (
    batch_id, product_id, qty, movement_type, reason, 
    linked_id, performed_by, performed_at
  ) VALUES (
    p_batch_id, v_batch.product_id, v_qty_change, 'ADJUST', p_reason,
    v_adjustment_id, v_user_id, NOW()
  );
  
  -- Create audit log
  INSERT INTO audit_logs (
    pharmacy_id, user_id, action, entity, entity_id, details
  ) VALUES (
    v_pharmacy_id, v_user_id, 'ADJUST', 'stock', v_adjustment_id,
    jsonb_build_object(
      'batch_id', p_batch_id,
      'product_id', v_batch.product_id,
      'qty_before', v_batch.qty_available,
      'qty_after', p_new_qty,
      'qty_change', v_qty_change,
      'reason', p_reason,
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'adjustment_id', v_adjustment_id,
    'qty_change', v_qty_change
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their pharmacy" ON audit_logs
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS policies for stock_adjustments
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock adjustments for their pharmacy" ON stock_adjustments
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON stock_adjustments TO authenticated;
GRANT EXECUTE ON FUNCTION perform_stock_adjustment TO authenticated;