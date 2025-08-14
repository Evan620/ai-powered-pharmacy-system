-- Fix UUID casting in create_pos_sale RPC function
-- This fixes the "column product_id is of type uuid but expression is of type text" error

CREATE OR REPLACE FUNCTION public.create_pos_sale(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  sale_id uuid;
  invoice_no text;
  total numeric := 0;
  -- variables for row insert
  pline jsonb;
  p_batch jsonb;
  line RECORD;
BEGIN
  -- Ensure current user
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authorized'; END IF;

  -- Generate invoice number (example: YYYYMMDD-XXXX)
  invoice_no := to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('pos_invoice_seq')::text, 4, '0');

  -- Calculate total
  FOR pline IN SELECT * FROM jsonb_array_elements(payload->'lines') LOOP
    total := total + ((pline->>'unit_price')::numeric * (pline->>'qty')::numeric - COALESCE((pline->>'discount')::numeric, 0));
  END LOOP;

  -- Insert sale record
  INSERT INTO sales (
    invoice_no, date, cashier_id, payment_type, total, pharmacy_id, status
  ) VALUES (
    invoice_no, now(), auth.uid(), payload->>'payment_type', total, current_user_pharmacy_id(), 'completed'
  ) RETURNING id INTO sale_id;

  -- Insert each sale_item (multiple for FEFO allocations)
  FOR pline IN SELECT * FROM jsonb_array_elements(payload->'lines') LOOP
    FOR p_batch IN SELECT * FROM jsonb_array_elements(pline->'allocations') LOOP
      INSERT INTO sale_items (
        sale_id, product_id, batch_id, qty, unit_price, discount
      ) VALUES (
        sale_id,
        (pline->>'product_id')::uuid,
        (p_batch->>'batch_id')::uuid,
        (p_batch->>'qty')::int,
        (pline->>'unit_price')::numeric,
        COALESCE((pline->>'discount')::numeric, 0)
      );

      -- Decrement batch stock atomically
      UPDATE batches
      SET qty_available = qty_available - (p_batch->>'qty')::int
      WHERE id = (p_batch->>'batch_id')::uuid AND qty_available >= (p_batch->>'qty')::int;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock or invalid batch for batch_id: %', p_batch->>'batch_id';
      END IF;
    END LOOP;
  END LOOP;

  -- Insert payment
  INSERT INTO payments (
    sale_id, method, amount, status
  ) VALUES (
    sale_id, payload->>'payment_type', total, 'completed'
  );

  RETURN jsonb_build_object('sale_id', sale_id, 'invoice_no', invoice_no);
END;
$$;
