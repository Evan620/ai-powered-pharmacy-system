-- Analytics indexes and views for reporting

-- 1) Helpful indexes for analytics
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_pharmacy_date ON public.sales(pharmacy_id, date);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_qty ON public.batches(expiry_date, qty_available);

-- 2) Top-selling products (last 30 days) per current pharmacy
--    Aggregates quantities and revenue.
CREATE OR REPLACE VIEW public.v_top_selling_products_30d AS
SELECT
  p.id            AS product_id,
  p.sku,
  p.generic_name,
  p.brand,
  SUM(si.qty)     AS total_qty,
  SUM(si.qty * si.unit_price - COALESCE(si.discount, 0))::numeric(14,2) AS total_revenue
FROM public.sale_items si
JOIN public.sales s
  ON s.id = si.sale_id
JOIN public.products p
  ON p.id = si.product_id
WHERE
  s.status = 'completed'
  AND s.date >= (now() - interval '30 days')
  AND s.pharmacy_id = public.current_user_pharmacy_id()
GROUP BY p.id, p.sku, p.generic_name, p.brand
ORDER BY total_qty DESC;

-- 3) Expiring batches in next 30 days for current pharmacy (qty_available > 0)
CREATE OR REPLACE VIEW public.v_expiring_batches_30d AS
SELECT
  b.id,
  b.product_id,
  p.generic_name,
  p.brand,
  b.batch_no,
  b.expiry_date,
  b.qty_available,
  b.cost_price
FROM public.batches b
JOIN public.products p
  ON p.id = b.product_id
WHERE
  p.pharmacy_id = public.current_user_pharmacy_id()
  AND b.qty_available > 0
  AND b.expiry_date <= (current_date + interval '30 days')
ORDER BY b.expiry_date ASC;

-- 4) Low-stock products (threshold 50 units) for current pharmacy
--    Sums available qty across batches for each product.
CREATE OR REPLACE VIEW public.v_low_stock_products AS
WITH stock AS (
  SELECT
    p.id AS product_id,
    p.sku,
    p.generic_name,
    p.brand,
    p.active,
    COALESCE(SUM(b.qty_available), 0) AS total_stock
  FROM public.products p
  LEFT JOIN public.batches b
    ON b.product_id = p.id
  WHERE
    p.pharmacy_id = public.current_user_pharmacy_id()
  GROUP BY p.id, p.sku, p.generic_name, p.brand, p.active
)
SELECT
  product_id,
  sku,
  generic_name,
  brand,
  total_stock,
  50::int AS threshold
FROM stock
WHERE active = true AND total_stock <= 50
ORDER BY total_stock ASC, generic_name ASC;
