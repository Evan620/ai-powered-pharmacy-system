-- Insert sample pharmacy
INSERT INTO pharmacies (id, name, address, timezone) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Pharmo Main Branch', '123 Kimathi Street, Nairobi', 'Africa/Nairobi');

-- Insert sample suppliers
INSERT INTO suppliers (id, pharmacy_id, name, contact, lead_time_days, min_order) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Acme Pharma Ltd', '+254700000001', 7, 10000.00),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'MediSupply Co', '+254700000002', 5, 5000.00),
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Global Health Distributors', '+254700000003', 10, 15000.00);

-- Insert sample products
INSERT INTO products (id, pharmacy_id, sku, generic_name, brand, form, unit, barcode, sell_price, active) VALUES 
('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 'PARA500', 'Paracetamol', 'Panadol', 'tablet', '500mg', '1234567890123', 15.00, true),
('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'AMOX250', 'Amoxicillin', 'Amoxil', 'capsule', '250mg', '1234567890124', 25.00, true),
('550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'IBU200', 'Ibuprofen', 'Brufen', 'tablet', '200mg', '1234567890125', 20.00, true),
('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'COUGH100', 'Dextromethorphan', 'Robitussin', 'syrup', '100ml', '1234567890126', 180.00, true);

-- Insert sample batches
INSERT INTO batches (id, product_id, batch_no, expiry_date, qty_received, qty_available, supplier_id, cost_price) VALUES 
('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440010', 'A12345', '2025-03-15', 1000, 688, '550e8400-e29b-41d4-a716-446655440001', 8.00),
('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', 'B03456', '2025-04-20', 500, 296, '550e8400-e29b-41d4-a716-446655440001', 15.00),
('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440012', 'C78901', '2025-02-10', 800, 624, '550e8400-e29b-41d4-a716-446655440002', 12.00),
('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440013', 'SX1234', '2024-12-25', 200, 190, '550e8400-e29b-41d4-a716-446655440003', 120.00);

-- Note: profiles table will be populated when users sign up via Supabase Auth
-- The sample data above provides a foundation for testing the application
