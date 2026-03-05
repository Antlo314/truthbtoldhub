-- Max Out Architect SP
-- Sets the soul_power column to 999,999 for all profiles where tier is 'Architect'

UPDATE profiles
SET soul_power = 999999
WHERE tier = 'Architect';
