-- Run this in your Supabase SQL Editor!
-- This will sync your existing global admin accounts to be the official Admins of the new Discord-style Chat workspace.

DO $$
DECLARE
    workspace_uid UUID := '00000000-0000-0000-0000-000000000000';
    admin1_id UUID;
    admin2_id UUID;
BEGIN
    -- Locate Admin 1
    SELECT id INTO admin1_id FROM auth.users WHERE email = 'iamwhoiambook@gmail.com' LIMIT 1;
    IF admin1_id IS NOT NULL THEN
        -- Ensure profile exists first to prevent foreign key error
        INSERT INTO profiles (id, display_name) VALUES (admin1_id, 'iamwhoiambook') ON CONFLICT DO NOTHING;
        
        INSERT INTO archive_workspace_members (user_id, workspace_id, role)
        VALUES (admin1_id, workspace_uid, 'Admin')
        ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = 'Admin';
        RAISE NOTICE 'Promoted iamwhoiambook@gmail.com to Workspace Admin.';
    END IF;

    -- Locate Admin 2
    SELECT id INTO admin2_id FROM auth.users WHERE email = 'admin@truthbtoldhub.com' LIMIT 1;
    IF admin2_id IS NOT NULL THEN
        -- Ensure profile exists first to prevent foreign key error
        INSERT INTO profiles (id, display_name) VALUES (admin2_id, 'Root Admin') ON CONFLICT DO NOTHING;
        
        INSERT INTO archive_workspace_members (user_id, workspace_id, role)
        VALUES (admin2_id, workspace_uid, 'Admin')
        ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = 'Admin';
        RAISE NOTICE 'Promoted admin@truthbtoldhub.com to Workspace Admin.';
    END IF;

END $$;
