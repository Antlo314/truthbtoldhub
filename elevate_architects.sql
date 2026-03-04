-- OBSIDIAN VOID: SYSTEM ARCHITECT ELEVATION
-- Run this in your Supabase SQL Editor to grant Architect privileges to the core team.

UPDATE profiles
SET tier = 'Architect'
WHERE email IN (
    'iamwhoiambook@gmail.com',
    'admin@truthbtoldhub.com',
    'info@lumenlabsatl.com'
);

-- Note: The user must have signed up first for their email to exist in the profiles table!
