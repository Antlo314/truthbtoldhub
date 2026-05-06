-- ==========================================
-- ADD SUPPORTER STATUS SCRIPT
-- ==========================================
-- This script ensures the is_supporter column exists
-- and provides a way to promote specific users.

-- 1. Ensure the column exists in the profiles table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_supporter') THEN
        ALTER TABLE profiles ADD COLUMN is_supporter BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Promote a specific user by email (Edit the email below)
DO $$
DECLARE
    target_email TEXT := 'iamwhoiambook@gmail.com'; -- <--- CHANGE THIS EMAIL
    target_id UUID;
BEGIN
    -- Locate the user ID from auth.users
    SELECT id INTO target_id FROM auth.users WHERE email = target_email LIMIT 1;
    
    IF target_id IS NOT NULL THEN
        -- Ensure profile exists with required fields
        INSERT INTO profiles (id, email, username, is_supporter, soul_power) 
        VALUES (
            target_id, 
            target_email, 
            split_part(target_email, '@', 1), -- Default username from email
            true, 
            400
        ) 
        ON CONFLICT (id) DO UPDATE 
        SET is_supporter = true, 
            soul_power = GREATEST(profiles.soul_power, 400); -- Supporters get a boost to 400 SP if they are lower
            
        RAISE NOTICE 'Promoted % to Founding Supporter status.', target_email;
    ELSE
        RAISE NOTICE 'User with email % not found.', target_email;
    END IF;
END $$;
