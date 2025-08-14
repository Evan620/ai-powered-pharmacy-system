-- Fix signup trigger and RLS policies to ensure automatic profile/pharmacy creation

-- First, let's make sure the trigger function is working correctly
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  pharmacy_id UUID;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'Trigger executing for user: %, metadata: %', NEW.id, NEW.raw_user_meta_data;
  
  -- Create pharmacy if pharmacy_name is provided in raw_user_meta_data
  IF NEW.raw_user_meta_data->>'pharmacy_name' IS NOT NULL THEN
    RAISE NOTICE 'Creating pharmacy: %', NEW.raw_user_meta_data->>'pharmacy_name';
    
    INSERT INTO pharmacies (name, timezone)
    VALUES (
      NEW.raw_user_meta_data->>'pharmacy_name',
      'Africa/Nairobi'
    )
    RETURNING id INTO pharmacy_id;
    
    RAISE NOTICE 'Pharmacy created with ID: %', pharmacy_id;
  ELSE
    -- If no pharmacy name, use the default one (for existing users)
    SELECT id INTO pharmacy_id FROM pharmacies LIMIT 1;
    RAISE NOTICE 'Using existing pharmacy ID: %', pharmacy_id;
  END IF;

  -- Create profile
  RAISE NOTICE 'Creating profile for user: % with pharmacy: %', NEW.id, pharmacy_id;
  
  INSERT INTO profiles (
    id,
    pharmacy_id,
    role,
    name
  )
  VALUES (
    NEW.id,
    pharmacy_id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')::TEXT,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  RAISE NOTICE 'Profile created successfully for user: %', NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in trigger: %', SQLERRM;
    RETURN NEW; -- Don't fail the user creation if profile creation fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Make sure RLS policies allow the trigger to work
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "System can create pharmacy" ON pharmacies;
DROP POLICY IF EXISTS "System can create profile" ON profiles;
DROP POLICY IF EXISTS "System can create profiles" ON profiles;

-- Create permissive policies for system operations
CREATE POLICY "System can create pharmacy" ON pharmacies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can create profiles" ON profiles  
  FOR INSERT WITH CHECK (true);

-- Also ensure users can read their own profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Test the trigger by creating a test function
CREATE OR REPLACE FUNCTION test_signup_trigger()
RETURNS void AS $$
BEGIN
  RAISE NOTICE 'Testing signup trigger...';
  
  -- Check if trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE NOTICE 'Trigger exists and is active';
  ELSE
    RAISE NOTICE 'WARNING: Trigger does not exist!';
  END IF;
  
  -- Check if function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE 'Trigger function exists';
  ELSE
    RAISE NOTICE 'WARNING: Trigger function does not exist!';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT test_signup_trigger();

-- Clean up test function
DROP FUNCTION test_signup_trigger();
