-- ==========================================
-- THE OBSIDIAN VOID: ADMIN ACCOUNT RESET
-- ==========================================
-- This script safely removes a specific user from the Supabase Authentication system
-- and their associated public profile, allowing them to re-register clean.

DO $$
DECLARE
    target_email TEXT := 'admin@truthbtoldhub.com';
    target_id UUID;
BEGIN
    -- 1. Find the user ID from the auth.users table based on the email
    SELECT id INTO target_id FROM auth.users WHERE email = target_email;

    -- 2. If the user exists, delete them from auth.users.
    -- Because our public.profiles table has `ON DELETE CASCADE` attached to its foreign key,
    -- this will automatically and safely delete their public profile row as well!
    IF target_id IS NOT NULL THEN
        DELETE FROM auth.users WHERE id = target_id;
        RAISE NOTICE 'User % has been completely erased from the Void.', target_email;
    ELSE
        RAISE NOTICE 'User % was not found in the system.', target_email;
    END IF;
END $$;
