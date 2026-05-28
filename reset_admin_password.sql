-- ==========================================
-- ADMIN PASSWORD RESET SCRIPT
-- ==========================================
-- Run this SQL query directly in your Supabase SQL Editor (Dashboard)
-- to set the email/password login credentials for your main admin.
--
-- This bypasses email confirmations and sets the password to:
--   SanctumPassword2026!

UPDATE auth.users 
SET encrypted_password = crypt('SanctumPassword2026!', gen_salt('bf'))
WHERE email = 'iamwhoiambook@gmail.com';

RAISE NOTICE 'Password successfully reset for iamwhoiambook@gmail.com to SanctumPassword2026!';
