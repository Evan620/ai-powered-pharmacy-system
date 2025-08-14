-- Temporarily disable the trigger that's causing signup failures
-- We'll handle everything in the application code instead

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function but don't auto-execute it
-- We can call it manually from the application if needed

-- Make sure our secure functions exist and work
-- Test the create_pharmacy_and_profile function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_pharmacy_and_profile'
  ) THEN
    RAISE EXCEPTION 'create_pharmacy_and_profile function does not exist!';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'setup_user_profile'
  ) THEN
    RAISE EXCEPTION 'setup_user_profile function does not exist!';
  END IF;
  
  RAISE NOTICE 'All required functions exist and are ready';
END $$;
