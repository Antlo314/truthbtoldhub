-- ==========================================
-- 1. ADD NEW COLUMNS TO EXISTING PROFILES TABLE
-- ==========================================
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "custom_title" TEXT,
ADD COLUMN IF NOT EXISTS "theme_color" TEXT DEFAULT 'sky';

-- ==========================================
-- 2. CREATE CODEX REPLIES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS "public"."codex_replies" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "whisper_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT "codex_replies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "codex_replies_whisper_id_fkey" FOREIGN KEY ("whisper_id") REFERENCES "public"."codex_whispers"("id") ON DELETE CASCADE,
    CONSTRAINT "codex_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
);

-- Turn on RLS for Replies
ALTER TABLE "public"."codex_replies" ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read replies
CREATE POLICY "Public Read Replies" ON "public"."codex_replies"
FOR SELECT USING (true);

-- Policy: Authenticated users can insert replies
CREATE POLICY "Auth Insert Replies" ON "public"."codex_replies"
FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Policy: Authors and Architects can delete replies
CREATE POLICY "Auth Delete Replies" ON "public"."codex_replies"
FOR DELETE USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tier = 'Architect'));

-- Policy: Authors and Architects can delete whispers (if not already added)
CREATE POLICY "Auth Delete Whispers" ON "public"."codex_whispers"
FOR DELETE USING (auth.uid() = author_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND tier = 'Architect'));
