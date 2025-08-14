-- Fix profile and RLS issues

-- First, let's make sure the RLS policies are correct
-- Drop and recreate the profiles policies to be more permissive

DROP POLICY IF EXISTS "Users can view profiles in their pharmacy" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "System can create profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Simple and clear profile policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow system/triggers to create profiles
CREATE POLICY "System can create profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Also fix the get_user_pharmacy_id function to handle cases where profile doesn't exist
CREATE OR REPLACE FUNCTION get_user_pharmacy_id()
RETURNS UUID AS $$
DECLARE
  pharmacy_id UUID;
BEGIN
  SELECT p.pharmacy_id INTO pharmacy_id
  FROM profiles p 
  WHERE p.id = auth.uid();
  
  -- If no profile found, return the first pharmacy (for development)
  IF pharmacy_id IS NULL THEN
    SELECT id INTO pharmacy_id FROM pharmacies LIMIT 1;
  END IF;
  
  RETURN pharmacy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure we have a default pharmacy for development
INSERT INTO pharmacies (id, name, timezone) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Default Pharmacy', 'Africa/Nairobi')
ON CONFLICT (id) DO NOTHING;

-- Function to create missing profiles for existing users
CREATE OR REPLACE FUNCTION create_missing_profiles()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  default_pharmacy_id UUID;
BEGIN
  -- Get the default pharmacy ID
  SELECT id INTO default_pharmacy_id FROM pharmacies LIMIT 1;
  
  -- Create profiles for users who don't have them
  FOR user_record IN 
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO profiles (id, pharmacy_id, role, name)
    VALUES (
      user_record.id,
      default_pharmacy_id,
      COALESCE(user_record.raw_user_meta_data->>'role', 'owner'),
      COALESCE(user_record.raw_user_meta_data->>'name', user_record.email)
    );
    
    RAISE NOTICE 'Created profile for user: %', user_record.email;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the function to create missing profiles
SELECT create_missing_profiles();

-- Drop the function after use
DROP FUNCTION create_missing_profiles();
