-- ============================================================================
--  SANCTUM HALLS — trim pass (run once in the Supabase SQL editor)
--
--  Removes the Inner Sanctum (supporters-only + architects-only Halls) and the
--  #the-path Hall from The Commons. Their messages cascade-delete with them.
--  Idempotent: safe to run more than once; does nothing if already removed.
--  (The same DELETE now lives in community_schema.sql so a fresh run never
--   re-creates these Halls.)
-- ============================================================================

DELETE FROM public.archive_channels
WHERE workspace_id = '00000000-0000-0000-0000-000000000000'
  AND name IN ('the-path', 'supporters-lounge', 'architects-table');
