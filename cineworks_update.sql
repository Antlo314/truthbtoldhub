-- ==========================================
-- 1. ADD STATUS COLUMN TO FILMS
-- ==========================================
ALTER TABLE "public"."films" 
ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'AVAILABLE';

-- ==========================================
-- 2. UPDATE EXISTING FILMS WITH NEW POSTERS & STATUS
-- ==========================================
-- Assuming these are the default films we just created in the seed.

-- Update film 1 (Awakening)
UPDATE "public"."films"
SET "thumbnail_url" = '/cineworks/poster1.png', "status" = 'AVAILABLE'
WHERE "title" ILIKE '%AWAKENING%';

-- Update film 2 (The Offering)
UPDATE "public"."films"
SET "thumbnail_url" = '/cineworks/poster2.png', "status" = 'COMING SOON'
WHERE "title" ILIKE '%OFFERING%';

-- Update film 3 (Echoes of Zion)
UPDATE "public"."films"
SET "thumbnail_url" = '/cineworks/poster3.png', "status" = 'POST-PRODUCTION'
WHERE "title" ILIKE '%ZION%';
