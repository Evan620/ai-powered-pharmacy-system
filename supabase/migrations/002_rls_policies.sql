-- Enable Row Level Security on all tables
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's pharmacy_id
CREATE OR REPLACE FUNCTION get_user_pharmacy_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT pharmacy_id 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view profiles in their pharmacy" ON profiles
  FOR SELECT USING (pharmacy_id = get_user_pharmacy_id());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Pharmacies policies
CREATE POLICY "Users can view their pharmacy" ON pharmacies
  FOR SELECT USING (id = get_user_pharmacy_id());

CREATE POLICY "Owners can update their pharmacy" ON pharmacies
  FOR UPDATE USING (
    id = get_user_pharmacy_id() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Suppliers policies
CREATE POLICY "Users can view suppliers in their pharmacy" ON suppliers
  FOR SELECT USING (pharmacy_id = get_user_pharmacy_id());

CREATE POLICY "Managers and owners can manage suppliers" ON suppliers
  FOR ALL USING (
    pharmacy_id = get_user_pharmacy_id() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Products policies
CREATE POLICY "Users can view products in their pharmacy" ON products
  FOR SELECT USING (pharmacy_id = get_user_pharmacy_id());

CREATE POLICY "Managers and owners can manage products" ON products
  FOR ALL USING (
    pharmacy_id = get_user_pharmacy_id() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Batches policies
CREATE POLICY "Users can view batches in their pharmacy" ON batches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE id = batches.product_id AND pharmacy_id = get_user_pharmacy_id()
    )
  );

CREATE POLICY "Managers and owners can manage batches" ON batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE id = batches.product_id AND pharmacy_id = get_user_pharmacy_id()
    ) AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Sales policies
CREATE POLICY "Users can view sales in their pharmacy" ON sales
  FOR SELECT USING (pharmacy_id = get_user_pharmacy_id());

CREATE POLICY "All users can create sales" ON sales
  FOR INSERT WITH CHECK (
    pharmacy_id = get_user_pharmacy_id() AND
    cashier_id = auth.uid()
  );

CREATE POLICY "Users can update their own sales" ON sales
  FOR UPDATE USING (
    pharmacy_id = get_user_pharmacy_id() AND
    cashier_id = auth.uid()
  );

-- Sale items policies
CREATE POLICY "Users can view sale items in their pharmacy" ON sale_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE id = sale_items.sale_id AND pharmacy_id = get_user_pharmacy_id()
    )
  );

CREATE POLICY "Users can manage sale items for their sales" ON sale_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE id = sale_items.sale_id 
      AND pharmacy_id = get_user_pharmacy_id()
      AND cashier_id = auth.uid()
    )
  );

-- Payments policies
CREATE POLICY "Users can view payments in their pharmacy" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE id = payments.sale_id AND pharmacy_id = get_user_pharmacy_id()
    )
  );

CREATE POLICY "Users can manage payments for their sales" ON payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE id = payments.sale_id 
      AND pharmacy_id = get_user_pharmacy_id()
      AND cashier_id = auth.uid()
    )
  );

-- Purchases policies
CREATE POLICY "Users can view purchases in their pharmacy" ON purchases
  FOR SELECT USING (pharmacy_id = get_user_pharmacy_id());

CREATE POLICY "Managers and owners can manage purchases" ON purchases
  FOR ALL USING (
    pharmacy_id = get_user_pharmacy_id() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Purchase items policies
CREATE POLICY "Users can view purchase items in their pharmacy" ON purchase_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM purchases 
      WHERE id = purchase_items.purchase_id AND pharmacy_id = get_user_pharmacy_id()
    )
  );

CREATE POLICY "Managers and owners can manage purchase items" ON purchase_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM purchases 
      WHERE id = purchase_items.purchase_id AND pharmacy_id = get_user_pharmacy_id()
    ) AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );
