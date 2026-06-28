-- ============================================================================
-- ENABLE REALTIME FOR THE SANCTUM CHAT  (run once in the Supabase SQL editor)
-- ============================================================================
-- Symptom this fixes: you send a message and see it instantly (optimistic), but
-- other people in the Hall don't see it until they refresh. That means the chat
-- tables aren't being broadcast over Supabase Realtime.
--
-- Most likely cause: archive_schema.sql does `DROP TABLE archive_messages CASCADE`,
-- and dropping a table silently removes it from the realtime publication. Re-running
-- the table schema after the community migration would kill live messages.
--
-- This script is idempotent and data-safe — it touches no rows, only publication
-- membership and replica identity. Safe to run anytime.
-- ============================================================================

-- 1. Make sure the realtime publication exists (Supabase creates it by default,
--    but recreate it if a project ever lost it).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. Add every chat / DM table to the publication if it isn't already a member.
DO $$
DECLARE
    t TEXT;
    tbls TEXT[] := ARRAY[
        'archive_channels',   -- live Hall create / rename / reorder / lock
        'archive_messages',   -- the actual chat messages  <-- the important one
        'archive_reactions',  -- live emoji reactions
        'archive_chat_bans',  -- live mute / ban
        'dm_messages'         -- direct-message ("Whisper") delivery
    ];
BEGIN
    FOREACH t IN ARRAY tbls LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = t
        ) AND NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- 3. Full row image so realtime DELETE / UPDATE events carry the keys the client
--    filters on (deleting a message, editing, pinning, removing a reaction).
ALTER TABLE public.archive_messages  REPLICA IDENTITY FULL;
ALTER TABLE public.archive_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.archive_chat_bans REPLICA IDENTITY FULL;
ALTER TABLE public.dm_messages       REPLICA IDENTITY FULL;

-- 4. VERIFY — after running, this list should include archive_messages,
--    archive_reactions, archive_chat_bans, archive_channels and dm_messages.
SELECT tablename AS "published_for_realtime"
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
ORDER BY tablename;
