-- ==========================================
-- ARCHITECT PROMOTION SCRIPT
-- ==========================================
-- This script upgrades a specific user by email
-- so they can access the Architect Chamber.

UPDATE profiles 
SET tier = 'Architect', soul_power = 9999
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'iamwhoiambook@gmail.com'
);
