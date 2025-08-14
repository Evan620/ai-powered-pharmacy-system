-- Create a function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  pharmacy_id UUID;
BEGIN
  -- Create pharmacy if pharmacy_name is provided in raw_user_meta_data
  IF NEW.raw_user_meta_data->>'pharmacy_name' IS NOT NULL THEN
    INSERT INTO pharmacies (name, timezone)
    VALUES (
      NEW.raw_user_meta_data->>'pharmacy_name',
      'Africa/Nairobi'
    )
    RETURNING id INTO pharmacy_id;
  ELSE
    -- If no pharmacy name, use the default one (for existing users)
    SELECT id INTO pharmacy_id FROM pharmacies LIMIT 1;
  END IF;

  -- Create profile
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update RLS policies to be more permissive during the signup process
DROP POLICY IF EXISTS "Anyone can create pharmacy during signup" ON pharmacies;
DROP POLICY IF EXISTS "Anyone can create profile during signup" ON profiles;

-- Allow the trigger function to create pharmacies and profiles
CREATE POLICY "System can create pharmacy" ON pharmacies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can create profile" ON profiles  
  FOR INSERT WITH CHECK (true);
