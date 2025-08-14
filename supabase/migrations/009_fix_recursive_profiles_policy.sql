-- Fix recursive RLS policy on profiles and standardize pharmacy scoping via helper function
-- This addresses errors like: 42P17: infinite recursion detected in policy for relation "profiles"

-- 1) Helper function to fetch current user's pharmacy_id without triggering RLS recursion
--    Must be SECURITY DEFINER and set search_path explicitly.
CREATE OR REPLACE FUNCTION public.get_user_pharmacy_id(uid uuid DEFAULT auth.uid())
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
  WHERE p.id = uid;
  RETURN pid;
END;
$$;

-- Grant execute to roles that may evaluate policies (PostgREST uses db user with these roles)
DO $$ BEGIN
  -- On Supabase, roles typically include authenticated and anon
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT EXECUTE ON FUNCTION public.get_user_pharmacy_id(uuid) TO authenticated;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT EXECUTE ON FUNCTION public.get_user_pharmacy_id(uuid) TO anon;
  END IF;
END $$;

-- 2) Replace recursive profiles policy: it previously selected from profiles inside profiles policy
--    which triggers recursion. Switch to using the helper function.
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
    pharmacy_id = public.get_user_pharmacy_id()
  );

-- Keep the self-view/update policies as-is but ensure they exist (id = auth.uid())
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

-- 3) Update pharmacies policies to use helper function for consistency and to avoid any indirect recursion
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pharmacies' AND policyname = 'Users can view their own pharmacy'
  ) THEN
    DROP POLICY "Users can view their own pharmacy" ON public.pharmacies;
  END IF;
END $$;

CREATE POLICY "Users can view their own pharmacy" ON public.pharmacies
  FOR SELECT USING (id = public.get_user_pharmacy_id());

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'pharmacies' AND policyname = 'Users can update their own pharmacy'
  ) THEN
    DROP POLICY "Users can update their own pharmacy" ON public.pharmacies;
  END IF;
END $$;

CREATE POLICY "Users can update their own pharmacy" ON public.pharmacies
  FOR UPDATE USING (id = public.get_user_pharmacy_id());

-- 4) Ensure other tables (products, batches, suppliers, etc.) can rely on the helper if they already reference it
--    No-op here if those policies already use get_user_pharmacy_id(); if not, consider updating them in a later migration.

-- Notes:
-- - SECURITY DEFINER function bypasses RLS while reading profiles to obtain pharmacy_id, avoiding recursion.
-- - search_path is set to prevent search path hijacking.
-- - Grants provided so PostgREST roles can execute the function during policy evaluation.
