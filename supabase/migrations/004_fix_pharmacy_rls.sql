-- Drop existing pharmacy policies
DROP POLICY IF EXISTS "Users can view their pharmacy" ON pharmacies;
DROP POLICY IF EXISTS "Owners can update their pharmacy" ON pharmacies;

-- Create new pharmacy policies that allow creation during signup
CREATE POLICY "Anyone can create pharmacy during signup" ON pharmacies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their pharmacy" ON pharmacies
  FOR SELECT USING (
    id = get_user_pharmacy_id() OR
    -- Allow viewing during signup process
    auth.uid() IS NULL
  );

CREATE POLICY "Owners can update their pharmacy" ON pharmacies
  FOR UPDATE USING (
    id = get_user_pharmacy_id() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Also update the profiles policy to allow creation during signup
DROP POLICY IF EXISTS "Users can view profiles in their pharmacy" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Anyone can create profile during signup" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view profiles in their pharmacy" ON profiles
  FOR SELECT USING (
    pharmacy_id = get_user_pharmacy_id() OR
    id = auth.uid()
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());
