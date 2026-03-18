-- Migration: Fix profile RLS policies to support upsert (INSERT + UPDATE)
-- and ensure Google Sign-In account deduplication works correctly.
--
-- Context: When Supabase "Link Identities" is enabled, signing in with Google
-- on an account that was created with email/password will reuse the same user ID.
-- The app does supabase.from('profiles').upsert(..., { onConflict: 'id' })
-- which requires both INSERT and UPDATE permissions on the profiles table.

-- Drop any conflicting policies first (safe — we recreate them below)
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_upsert_own" ON public.profiles;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- INSERT: Users can insert their own profile row
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile row
-- This is required for the upsert onConflict:'id' path
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Users can delete their own profile (for account deletion)
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Service role bypass (for server-side operations and migrations)
DROP POLICY IF EXISTS "profiles_service_role_all" ON public.profiles;
CREATE POLICY "profiles_service_role_all" ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.profiles IS 'User profile data. RLS enforces that users can only access their own row. Supports upsert for Google Sign-In account linking/deduplication.';
