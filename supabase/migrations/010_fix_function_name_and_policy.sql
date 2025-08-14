-- Resolve function ambiguity and update policies to avoid recursion
-- Prior attempt used public.get_user_pharmacy_id() which collided with an existing function.
-- Introduce a uniquely named helper and rewrite policies to use it.

-- 1) New helper function with unique name (zero-arg) to avoid overload ambiguity
CREATE OR REPLACE FUNCTION public.current_user_pharmacy_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  pid uuid;
BEGIN
  SELECT p.pharmacy_id INTO pid
  FROM public.profiles p
  WHERE p.id = auth.uid();
  RETURN pid;
END;
$$;

-- Allow execution by web roles (used during policy evaluation)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.current_user_pharmacy_id() TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT EXECUTE ON FUNCTION public.current_user_pharmacy_id() TO anon;
  END IF;
END $$;

-- 2) Recreate profiles policy to use the non-recursive helper
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view profiles in their pharmacy'
  ) THEN
    DROP POLICY "Users can view profiles in their pharmacy" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Users can view profiles in their pharmacy" ON public.profiles
  FOR SELECT USING (
    pharmacy_id = public.current_user_pharmacy_id()
  );

-- Ensure self-view/self-update policies exist (id = auth.uid())
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile" ON public.profiles
      FOR SELECT USING (id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON public.profiles
      FOR UPDATE USING (id = auth.uid());
  END IF;
END $$;

-- 3) Update pharmacies policies to use the unique helper as well
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pharmacies' AND policyname = 'Users can view their own pharmacy'
  ) THEN
    DROP POLICY "Users can view their own pharmacy" ON public.pharmacies;
  END IF;
END $$;

CREATE POLICY "Users can view their own pharmacy" ON public.pharmacies
  FOR SELECT USING (id = public.current_user_pharmacy_id());

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pharmacies' AND policyname = 'Users can update their own pharmacy'
  ) THEN
    DROP POLICY "Users can update their own pharmacy" ON public.pharmacies;
  END IF;
END $$;

CREATE POLICY "Users can update their own pharmacy" ON public.pharmacies
  FOR UPDATE USING (id = public.current_user_pharmacy_id());

-- Notes:
-- - This avoids calling any overloaded/ambiguous get_user_pharmacy_id() implementation already present in DB.
-- - SECURITY DEFINER with explicit search_path prevents recursion and search-path hijacking.
