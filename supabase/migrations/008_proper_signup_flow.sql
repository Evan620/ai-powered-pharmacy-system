-- Proper multi-tenant signup flow following Supabase best practices

-- First, let's fix the RLS policies to allow proper signup flow
-- Drop all existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Users can update their pharmacy" ON pharmacies;
DROP POLICY IF EXISTS "System can create pharmacy" ON pharmacies;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "System can create profiles" ON profiles;

-- Create a signup function that runs with elevated privileges
CREATE OR REPLACE FUNCTION create_pharmacy_and_profile(
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  pharmacy_name TEXT,
  user_role TEXT DEFAULT 'owner'
)
RETURNS JSON AS $$
DECLARE
  new_pharmacy_id UUID;
  new_profile RECORD;
  result JSON;
BEGIN
  -- Create the pharmacy first
  INSERT INTO pharmacies (name, timezone)
  VALUES (pharmacy_name, 'Africa/Nairobi')
  RETURNING id INTO new_pharmacy_id;
  
  -- Create the profile
  INSERT INTO profiles (id, pharmacy_id, role, name)
  VALUES (user_id, new_pharmacy_id, user_role, user_name)
  RETURNING * INTO new_profile;
  
  -- Return the created data
  SELECT json_build_object(
    'pharmacy_id', new_pharmacy_id,
    'profile', row_to_json(new_profile)
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- Return error information
    RETURN json_build_object(
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_pharmacy_and_profile TO authenticated;

-- Create simple RLS policies that work with the function
CREATE POLICY "Users can view their own pharmacy" ON pharmacies
  FOR SELECT USING (
    id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own pharmacy" ON pharmacies
  FOR UPDATE USING (
    id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow the function to create pharmacies
CREATE POLICY "Function can create pharmacies" ON pharmacies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their pharmacy" ON profiles
  FOR SELECT USING (
    pharmacy_id IN (
      SELECT pharmacy_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Allow the function to create profiles
CREATE POLICY "Function can create profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Update the trigger to use the new function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  result JSON;
BEGIN
  -- Only create pharmacy and profile if metadata is provided
  IF NEW.raw_user_meta_data->>'pharmacy_name' IS NOT NULL THEN
    -- Call our secure function
    SELECT create_pharmacy_and_profile(
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.raw_user_meta_data->>'pharmacy_name',
      COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
    ) INTO result;
    
    -- Log the result
    RAISE NOTICE 'Pharmacy and profile creation result: %', result;
    
    -- Check if there was an error
    IF result->>'error' IS NOT NULL THEN
      RAISE NOTICE 'Error creating pharmacy and profile: %', result->>'error';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create a function to manually create missing profiles (for existing users)
CREATE OR REPLACE FUNCTION setup_user_profile(
  pharmacy_name TEXT DEFAULT 'Default Pharmacy'
)
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  result JSON;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  
  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM profiles WHERE id = current_user_id) THEN
    RETURN json_build_object('error', 'Profile already exists');
  END IF;
  
  -- Get user email
  SELECT create_pharmacy_and_profile(
    current_user_id,
    (SELECT email FROM auth.users WHERE id = current_user_id),
    (SELECT email FROM auth.users WHERE id = current_user_id),
    pharmacy_name,
    'owner'
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION setup_user_profile TO authenticated;
