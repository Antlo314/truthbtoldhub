-- ==========================================
-- ARCHITECT PROMOTION & PROFILE INJECTION 
-- ==========================================
-- Since your '0 rows returned' error means your auth account 
-- doesn't have a profile row yet, this script forces the creation 
-- of the row and grants you Architect status.
-- This version explicitly includes the 'email' column to satisfy constraints.

INSERT INTO public.profiles (id, email, tier, soul_power)
SELECT id, email, 'Architect', 9999 
FROM auth.users 
WHERE email = 'iamwhoiambook@gmail.com'
ON CONFLICT (id) DO UPDATE 
SET tier = 'Architect', soul_power = 9999;
