-- Run this in your Supabase SQL Editor to make yourself an Admin of the Sanctum Global workspace
-- This permits you to delete ANY message.

DO $$
DECLARE
    target_user_id UUID;
    global_workspace_id UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
    -- NOTE: Change 'your-email@test.com' to the exact email you used to sign up/login!
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'your-email@test.com' LIMIT 1;

    IF target_user_id IS NOT NULL THEN
        INSERT INTO archive_workspace_members (user_id, workspace_id, role)
        VALUES (target_user_id, global_workspace_id, 'Admin')
        ON CONFLICT (user_id, workspace_id) 
        DO UPDATE SET role = 'Admin';
        
        RAISE NOTICE 'Success! User promoted to Admin in Sanctum Global.';
    ELSE
        RAISE EXCEPTION 'User not found. Check the email string.';
    END IF;
END $$;
