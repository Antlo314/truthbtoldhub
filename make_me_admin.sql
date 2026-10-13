-- Run this in your Supabase SQL Editor!
-- This makes the Architect (iamwhoiambook@gmail.com) the Admin of the Sanctum chat workspace.

DO $$
DECLARE
    workspace_uid UUID := '00000000-0000-0000-0000-000000000000';
    admin1_id UUID;
BEGIN
    -- Locate the Architect
    SELECT id INTO admin1_id FROM auth.users WHERE email = 'iamwhoiambook@gmail.com' LIMIT 1;
    IF admin1_id IS NOT NULL THEN
        -- Ensure profile exists first to prevent foreign key error
        INSERT INTO profiles (id, display_name) VALUES (admin1_id, 'iamwhoiambook') ON CONFLICT DO NOTHING;

        INSERT INTO archive_workspace_members (user_id, workspace_id, role)
        VALUES (admin1_id, workspace_uid, 'Admin')
        ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = 'Admin';
        RAISE NOTICE 'Promoted iamwhoiambook@gmail.com to Workspace Admin.';
    END IF;
END $$;
