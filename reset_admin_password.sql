-- ==========================================
-- ARCHITECT PASSWORD RESET
-- ==========================================
-- Run in the Supabase SQL Editor to set the password for the Architect
-- account directly (no email round-trip).
--
-- 1. Make a strong password on YOUR machine, e.g. in a terminal:
--      node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
--    and keep it in your password manager.
-- 2. Paste it below in place of PASTE-YOUR-NEW-PASSWORD-HERE and run.
-- 3. Do NOT save this file with the real password in it, and never commit it.
--
-- (The easier way: "Forgot password?" in the sign-in box emails you a link.)

UPDATE auth.users
SET encrypted_password = crypt('PASTE-YOUR-NEW-PASSWORD-HERE', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email = 'iamwhoiambook@gmail.com';
