-- ============================================================================
-- ONE ARCHITECT: iamwhoiambook@gmail.com
-- ============================================================================
-- Run once in the Supabase SQL Editor (safe to re-run).
--
-- The Hub's admin powers are decided by the email in the signed login token,
-- never by a column a user could edit. Until now two emails passed the check
-- (iamwhoiambook@gmail.com and admin@truthbtoldhub.com). This narrows every
-- server-side admin check to the one Architect. The app's own list is
-- lib/adminEmails.ts — keep the two in sync.
--
-- To remove the old admin@truthbtoldhub.com account entirely, run
-- delete_admin.sql afterwards.
-- ============================================================================

-- The Sanctum / the Hall (community_schema.sql)
CREATE OR REPLACE FUNCTION public.is_sanctum_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT (auth.jwt() ->> 'email') = 'iamwhoiambook@gmail.com';
$$;

-- The Library (library_schema.sql)
CREATE OR REPLACE FUNCTION public.is_library_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT (auth.jwt() ->> 'email') = 'iamwhoiambook@gmail.com';
$$;

-- Dispatches storage (secure_dispatches_storage.sql)
CREATE OR REPLACE FUNCTION public.is_hub_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT (auth.jwt() ->> 'email') = 'iamwhoiambook@gmail.com';
$$;

-- The Hall also honours a workspace "Admin" role: step the old account down
UPDATE public.archive_workspace_members
SET role = 'Member'
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'admin@truthbtoldhub.com');

GRANT EXECUTE ON FUNCTION public.is_sanctum_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_library_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_hub_admin() TO authenticated, anon;
