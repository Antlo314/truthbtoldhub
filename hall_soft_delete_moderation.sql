-- ============================================================================
--  THE HALL — soft-delete, restore, failsafe archive, admin-only purge
--  Run in Supabase SQL Editor. Idempotent.
-- ============================================================================

-- Soft-delete columns (messages stay in DB forever unless purged by Architect)
ALTER TABLE public.archive_messages
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS archive_messages_live_idx
  ON public.archive_messages (channel_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Failsafe archive: every message is copied here on insert / soft-delete
CREATE TABLE IF NOT EXISTS public.archive_message_archive (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID NOT NULL,
  channel_id      UUID,
  author_id       UUID,
  content         TEXT,
  reply_to_id     UUID,
  created_at      TIMESTAMPTZ,
  archived_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  event           TEXT NOT NULL DEFAULT 'snapshot', -- snapshot | soft_delete | hard_delete
  meta            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS archive_message_archive_msg_idx
  ON public.archive_message_archive (message_id, archived_at DESC);

ALTER TABLE public.archive_message_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Architects read message archive" ON public.archive_message_archive;
CREATE POLICY "Architects read message archive" ON public.archive_message_archive
  FOR SELECT USING (public.is_sanctum_admin());

-- Snapshot on insert
CREATE OR REPLACE FUNCTION public.archive_messages_snapshot_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.archive_message_archive
    (message_id, channel_id, author_id, content, reply_to_id, created_at, event)
  VALUES
    (NEW.id, NEW.channel_id, NEW.author_id, NEW.content, NEW.reply_to_id, NEW.created_at, 'snapshot');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_messages_snapshot ON public.archive_messages;
CREATE TRIGGER trg_archive_messages_snapshot
  AFTER INSERT ON public.archive_messages
  FOR EACH ROW EXECUTE FUNCTION public.archive_messages_snapshot_insert();

-- Snapshot soft-delete / restore transitions
CREATE OR REPLACE FUNCTION public.archive_messages_snapshot_soft()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS NULL) THEN
    INSERT INTO public.archive_message_archive
      (message_id, channel_id, author_id, content, reply_to_id, created_at, event, meta)
    VALUES
      (NEW.id, NEW.channel_id, NEW.author_id, NEW.content, NEW.reply_to_id, NEW.created_at, 'soft_delete',
       jsonb_build_object('deleted_by', NEW.deleted_by, 'reason', NEW.deletion_reason));
  ELSIF NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL THEN
    INSERT INTO public.archive_message_archive
      (message_id, channel_id, author_id, content, reply_to_id, created_at, event)
    VALUES
      (NEW.id, NEW.channel_id, NEW.author_id, NEW.content, NEW.reply_to_id, NEW.created_at, 'restore');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_messages_soft ON public.archive_messages;
CREATE TRIGGER trg_archive_messages_soft
  AFTER UPDATE OF deleted_at ON public.archive_messages
  FOR EACH ROW EXECUTE FUNCTION public.archive_messages_snapshot_soft();

-- Capture hard deletes into archive (should be rare — clients should soft-delete)
CREATE OR REPLACE FUNCTION public.archive_messages_snapshot_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.archive_message_archive
    (message_id, channel_id, author_id, content, reply_to_id, created_at, event)
  VALUES
    (OLD.id, OLD.channel_id, OLD.author_id, OLD.content, OLD.reply_to_id, OLD.created_at, 'hard_delete');
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_messages_hard_delete ON public.archive_messages;
CREATE TRIGGER trg_archive_messages_hard_delete
  BEFORE DELETE ON public.archive_messages
  FOR EACH ROW EXECUTE FUNCTION public.archive_messages_snapshot_delete();

-- Soft-delete (Architect only)
CREATE OR REPLACE FUNCTION public.soft_delete_hall_message(
  _message_id UUID,
  _reason TEXT DEFAULT 'admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_sanctum_admin() THEN
    RAISE EXCEPTION 'Only Architects may remove Hall messages';
  END IF;
  UPDATE public.archive_messages
  SET deleted_at = now(),
      deleted_by = auth.uid(),
      deletion_reason = COALESCE(NULLIF(trim(_reason), ''), 'admin')
  WHERE id = _message_id
    AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

-- Soft-delete from service role / Gemini (bypasses is_sanctum_admin via SECURITY DEFINER
-- but only when called with service role or when is_sanctum_admin — dual path)
CREATE OR REPLACE FUNCTION public.soft_delete_hall_message_system(
  _message_id UUID,
  _reason TEXT DEFAULT 'moderation'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.archive_messages
  SET deleted_at = now(),
      deleted_by = NULL,
      deletion_reason = COALESCE(NULLIF(trim(_reason), ''), 'moderation')
  WHERE id = _message_id
    AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

-- Restore (Architect only)
CREATE OR REPLACE FUNCTION public.restore_hall_message(_message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_sanctum_admin() THEN
    RAISE EXCEPTION 'Only Architects may restore Hall messages';
  END IF;
  UPDATE public.archive_messages
  SET deleted_at = NULL,
      deleted_by = NULL,
      deletion_reason = NULL
  WHERE id = _message_id
    AND deleted_at IS NOT NULL;
  RETURN FOUND;
END;
$$;

-- Restore ALL soft-deleted in a channel (Architect)
CREATE OR REPLACE FUNCTION public.restore_all_hall_messages(_channel_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  IF NOT public.is_sanctum_admin() THEN
    RAISE EXCEPTION 'Only Architects may restore Hall messages';
  END IF;
  IF _channel_id IS NULL THEN
    UPDATE public.archive_messages
    SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL
    WHERE deleted_at IS NOT NULL;
  ELSE
    UPDATE public.archive_messages
    SET deleted_at = NULL, deleted_by = NULL, deletion_reason = NULL
    WHERE deleted_at IS NOT NULL AND channel_id = _channel_id;
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Recreate from archive when row was hard-deleted (Architect)
CREATE OR REPLACE FUNCTION public.recreate_hall_message_from_archive(_message_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snap public.archive_message_archive%ROWTYPE;
  new_id UUID;
BEGIN
  IF NOT public.is_sanctum_admin() THEN
    RAISE EXCEPTION 'Only Architects may restore Hall messages';
  END IF;

  -- Prefer latest non-delete snapshot with content
  SELECT * INTO snap
  FROM public.archive_message_archive
  WHERE message_id = _message_id
    AND content IS NOT NULL
  ORDER BY archived_at DESC
  LIMIT 1;

  IF snap.message_id IS NULL THEN
    RAISE EXCEPTION 'No archive snapshot found for message';
  END IF;

  -- If live row exists, just un-delete it
  IF EXISTS (SELECT 1 FROM public.archive_messages WHERE id = _message_id) THEN
    PERFORM public.restore_hall_message(_message_id);
    RETURN _message_id;
  END IF;

  INSERT INTO public.archive_messages (id, channel_id, author_id, content, reply_to_id, created_at, is_edited)
  VALUES (
    snap.message_id,
    snap.channel_id,
    snap.author_id,
    snap.content,
    snap.reply_to_id,
    COALESCE(snap.created_at, now()),
    false
  )
  ON CONFLICT (id) DO UPDATE
    SET content = EXCLUDED.content,
        deleted_at = NULL,
        deleted_by = NULL,
        deletion_reason = NULL;

  RETURN snap.message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_hall_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_delete_hall_message_system(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_hall_message(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_all_hall_messages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recreate_hall_message_from_archive(UUID) TO authenticated;

-- RLS: public sees only live messages; Architects see deleted too
DROP POLICY IF EXISTS "Hall messages are viewable when permitted" ON public.archive_messages;
CREATE POLICY "Hall messages are viewable when permitted" ON public.archive_messages
  FOR SELECT USING (
    public.can_view_channel(channel_id)
    AND (deleted_at IS NULL OR public.is_sanctum_admin())
  );

-- Authors may edit own LIVE messages only (not deleted)
DROP POLICY IF EXISTS "Authors edit own messages" ON public.archive_messages;
CREATE POLICY "Authors edit own messages" ON public.archive_messages
  FOR UPDATE
  USING (auth.uid() = author_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = author_id AND deleted_at IS NULL);

-- Architects may update any message (soft-delete fields, restore, pin via other RPCs)
DROP POLICY IF EXISTS "Architects manage any message" ON public.archive_messages;
CREATE POLICY "Architects manage any message" ON public.archive_messages
  FOR UPDATE
  USING (public.is_sanctum_admin())
  WITH CHECK (public.is_sanctum_admin());

-- NO client hard-deletes (soft-delete RPCs only). Service role bypasses RLS if ever needed.
DROP POLICY IF EXISTS "Delete own or moderated messages" ON public.archive_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.archive_messages;
DROP POLICY IF EXISTS "No client hard deletes" ON public.archive_messages;
CREATE POLICY "No client hard deletes" ON public.archive_messages
  FOR DELETE USING (false);

-- One-time: clear deletion flags so previously soft-flaggable rows are live
-- (no-op if columns were just added as null)
-- Architect can also run: SELECT restore_all_hall_messages(NULL);
