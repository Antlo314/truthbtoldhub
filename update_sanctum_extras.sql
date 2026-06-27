-- ============================================================================
--  SANCTUM EXTRAS — run once in the Supabase SQL editor. Idempotent.
--    1) Admins can reliably POST in locked Halls (e.g. #welcome, #announcements).
--    2) Staff (Architects + Moderators) can PIN/unpin messages.
--    3) A pinned welcome message in #welcome (only if it's empty).
-- ============================================================================

-- 1) Robust "can post" — Architect email OR a stamped workspace Admin may post
--    anywhere, including locked Halls (membership check covers any JWT-claim gap).
CREATE OR REPLACE FUNCTION public.can_post_channel(_channel_id UUID)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    _locked BOOLEAN;
    _ws UUID;
BEGIN
    IF auth.uid() IS NULL THEN RETURN false; END IF;
    SELECT locked, workspace_id INTO _locked, _ws FROM public.archive_channels WHERE id = _channel_id;
    IF public.is_sanctum_admin() OR EXISTS (
        SELECT 1 FROM public.archive_workspace_members m
        WHERE m.user_id = auth.uid() AND m.workspace_id = _ws AND m.role = 'Admin'
    ) THEN
        RETURN true;
    END IF;
    IF NOT public.can_view_channel(_channel_id) THEN RETURN false; END IF;
    IF public.is_chat_banned(auth.uid()) THEN RETURN false; END IF;
    RETURN NOT COALESCE(_locked, false);
END;
$$;

-- 2) Staff pin/unpin via RPC (mods can pin without editing others' text).
--    Requires can_manage_sanctum() — run update_sanctum_staff_perms.sql first
--    if you haven't (it defines that predicate).
CREATE OR REPLACE FUNCTION public.set_message_pin(_message_id UUID, _pinned BOOLEAN)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _ws UUID;
BEGIN
    SELECT c.workspace_id INTO _ws
    FROM public.archive_messages msg
    JOIN public.archive_channels c ON c.id = msg.channel_id
    WHERE msg.id = _message_id;
    IF NOT public.can_manage_sanctum(_ws) THEN
        RAISE EXCEPTION 'Staff power required to pin';
    END IF;
    UPDATE public.archive_messages
    SET pinned = _pinned,
        pinned_by = CASE WHEN _pinned THEN auth.uid() ELSE NULL END,
        pinned_at = CASE WHEN _pinned THEN NOW() ELSE NULL END
    WHERE id = _message_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_message_pin(UUID, BOOLEAN) TO authenticated;

-- 3) Pinned welcome message in #welcome (only if the Hall is currently empty).
DO $$
DECLARE
    ws  UUID := '00000000-0000-0000-0000-000000000000';
    wid UUID;
    aid UUID;
BEGIN
    SELECT id INTO wid FROM public.archive_channels WHERE workspace_id = ws AND name = 'welcome' LIMIT 1;
    SELECT id INTO aid FROM public.profiles WHERE email IN ('iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com') ORDER BY created_at LIMIT 1;
    IF wid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.archive_messages WHERE channel_id = wid) THEN
        INSERT INTO public.archive_messages (channel_id, author_id, content, pinned, pinned_by, pinned_at)
        VALUES (
            wid, aid,
            E'Welcome to The Sanctum. \U0001F54A️\n\nThis is our gathering place — a hall for every soul walking the journey. Here we meet, speak, and lift one another.\n\n• Read the Sanctum Code (it pops up on your first visit).\n• Say hello in #general and tell us who you are.\n• Bear witness in #testimonies; ask for guidance in #support.\n\nWalk in good faith. We are glad you are here.',
            true, aid, NOW()
        );
    END IF;
END $$;
