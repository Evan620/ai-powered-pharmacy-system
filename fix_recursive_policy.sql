-- Single migration to fix the recursive RLS policy issue
-- Run this directly in Supabase SQL Editor

-- 1) Create a helper function to get current user's pharmacy_id without recursion
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.current_user_pharmacy_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_pharmacy_id() TO anon;

-- 2) Drop and recreate the problematic profiles policy
DROP POLICY IF EXISTS "Users can view profiles in their pharmacy" ON public.profiles;

CREATE POLICY "Users can view profiles in their pharmacy" ON public.profiles
  FOR SELECT USING (
    pharmacy_id = public.current_user_pharmacy_id()
  );

-- 3) Ensure basic self-access policies exist
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

-- 4) Update pharmacies policies to use the helper function
DROP POLICY IF EXISTS "Users can view their own pharmacy" ON public.pharmacies;
DROP POLICY IF EXISTS "Users can update their own pharmacy" ON public.pharmacies;

CREATE POLICY "Users can view their own pharmacy" ON public.pharmacies
  FOR SELECT USING (id = public.current_user_pharmacy_id());

CREATE POLICY "Users can update their own pharmacy" ON public.pharmacies
  FOR UPDATE USING (id = public.current_user_pharmacy_id());

-- 5) Update other table policies to use the helper function if they reference get_user_pharmacy_id
-- Products
DROP POLICY IF EXISTS "Users can view products in their pharmacy" ON public.products;
CREATE POLICY "Users can view products in their pharmacy" ON public.products
  FOR SELECT USING (pharmacy_id = public.current_user_pharmacy_id());

DROP POLICY IF EXISTS "Managers and owners can manage products" ON public.products;
CREATE POLICY "Managers and owners can manage products" ON public.products
  FOR ALL USING (
    pharmacy_id = public.current_user_pharmacy_id() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Suppliers
DROP POLICY IF EXISTS "Users can view suppliers in their pharmacy" ON public.suppliers;
CREATE POLICY "Users can view suppliers in their pharmacy" ON public.suppliers
  FOR SELECT USING (pharmacy_id = public.current_user_pharmacy_id());

DROP POLICY IF EXISTS "Managers and owners can manage suppliers" ON public.suppliers;
CREATE POLICY "Managers and owners can manage suppliers" ON public.suppliers
  FOR ALL USING (
    pharmacy_id = public.current_user_pharmacy_id() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Batches
DROP POLICY IF EXISTS "Users can view batches in their pharmacy" ON public.batches;
CREATE POLICY "Users can view batches in their pharmacy" ON public.batches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = batches.product_id AND p.pharmacy_id = public.current_user_pharmacy_id()
    )
  );

DROP POLICY IF EXISTS "Managers and owners can manage batches" ON public.batches;
CREATE POLICY "Managers and owners can manage batches" ON public.batches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = batches.product_id AND p.pharmacy_id = public.current_user_pharmacy_id()
    ) AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('owner', 'manager')
    )
  );