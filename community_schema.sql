-- ============================================================================
--  THE ARCHIVE — COMMUNITY DEEPENING MIGRATION
--  (Discord-style halls + reactions + pins + edits + 1:1 DMs + moderation +
--   gated halls + richer profiles)
--
--  Builds ON TOP of archive_schema.sql. Fully self-contained and IDEMPOTENT:
--  it (re)creates the base archive tables only if they are missing, then adds
--  every new column / table / policy / function with IF-NOT-EXISTS guards, so
--  it is safe to run whether or not archive_schema.sql was applied first, and
--  safe to re-run.
--
--  Security model (mirrors the rest of the app):
--    * Architect = a verified, JWT-signed admin email (cannot be spoofed). The
--      list MUST stay in sync with lib/adminEmails.ts and library_schema.sql's
--      is_library_admin().  ->  public.is_sanctum_admin()
--    * Privileged writes (create/rename/delete halls, pin, mute/ban-from-chat,
--      delete anyone's message) are gated in RLS by is_sanctum_admin() and/or a
--      per-workspace Moderator role — defence in depth on top of the UI.
--    * Gated halls (supporters-only / architects-only / locked) are enforced by
--      SECURITY DEFINER predicates referenced from the message & channel RLS, so
--      a hidden hall's existence and messages never reach an unauthorised soul.
--    * DMs are visible only to their two participants (RLS on both tables).
--
--  Run once in the Supabase SQL editor.
-- ============================================================================


-- ============================================================================
-- 0. HELPER FUNCTIONS
-- ============================================================================

-- Architect check — JWT email, unspoofable. Keep in sync with lib/adminEmails.ts.
CREATE OR REPLACE FUNCTION public.is_sanctum_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT (auth.jwt() ->> 'email') IN ('iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com');
$$;

-- Is the calling soul a supporter? (used for supporter-gated halls)
CREATE OR REPLACE FUNCTION public.soul_is_supporter()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT COALESCE((SELECT is_supporter FROM public.profiles WHERE id = auth.uid()), false);
$$;


-- ============================================================================
-- 1. BASE TABLES (created only if archive_schema.sql has not run yet)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.archive_workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    icon_url    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.archive_channels (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id  UUID REFERENCES public.archive_workspaces(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    type          TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice')),
    topic         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.archive_workspace_members (
    user_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id  UUID REFERENCES public.archive_workspaces(id) ON DELETE CASCADE,
    role          TEXT DEFAULT 'Member' CHECK (role IN ('Admin', 'Moderator', 'Member')),
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, workspace_id)
);

CREATE TABLE IF NOT EXISTS public.archive_messages (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id   UUID REFERENCES public.archive_channels(id) ON DELETE CASCADE,
    author_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content      TEXT NOT NULL,
    reply_to_id  UUID REFERENCES public.archive_messages(id) ON DELETE SET NULL,
    is_edited    BOOLEAN DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 2. NEW COLUMNS ON EXISTING TABLES (idempotent)
-- ============================================================================

-- Halls (channels) gain ordering, grouping, locking and access gating.
ALTER TABLE public.archive_channels ADD COLUMN IF NOT EXISTS position         INTEGER     DEFAULT 0;
ALTER TABLE public.archive_channels ADD COLUMN IF NOT EXISTS category         TEXT        DEFAULT 'The Commons';
ALTER TABLE public.archive_channels ADD COLUMN IF NOT EXISTS locked           BOOLEAN     DEFAULT false; -- read-only for non-Architects
ALTER TABLE public.archive_channels ADD COLUMN IF NOT EXISTS access           TEXT        DEFAULT 'everyone'; -- everyone | supporters | architects
ALTER TABLE public.archive_channels ADD COLUMN IF NOT EXISTS slowmode_seconds INTEGER     DEFAULT 0;

-- Drop any prior access constraint then (re)assert the allowed set.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'archive_channels_access_chk') THEN
        ALTER TABLE public.archive_channels DROP CONSTRAINT archive_channels_access_chk;
    END IF;
    ALTER TABLE public.archive_channels
        ADD CONSTRAINT archive_channels_access_chk CHECK (access IN ('everyone', 'supporters', 'architects'));
END $$;

-- Messages gain pin metadata.
ALTER TABLE public.archive_messages ADD COLUMN IF NOT EXISTS pinned     BOOLEAN     DEFAULT false;
ALTER TABLE public.archive_messages ADD COLUMN IF NOT EXISTS pinned_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.archive_messages ADD COLUMN IF NOT EXISTS pinned_at  TIMESTAMPTZ;

-- Profiles gain richer, client-editable cosmetic fields.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url   TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pronouns     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location     TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status       TEXT;             -- short custom status line
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS links        JSONB DEFAULT '[]'::jsonb; -- [{label,url}]
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- These new profile columns are cosmetic/self-owned, so the column-level UPDATE
-- grant from secure_profiles_privileges.sql must be widened to include them.
-- (tier / soul_power / is_supporter / is_banned remain server-only.)
GRANT UPDATE (banner_url, pronouns, location, status, links, last_seen_at)
    ON public.profiles TO authenticated;


-- ============================================================================
-- 3. NEW TABLES
-- ============================================================================

-- Emoji reactions on hall messages.
CREATE TABLE IF NOT EXISTS public.archive_reactions (
    message_id  UUID NOT NULL REFERENCES public.archive_messages(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id, emoji)
);

-- Chat-level bans / mutes (separate from the account-wide profiles.is_banned).
-- until IS NULL  => permanent ban from chat.  A future timestamp => temp mute.
CREATE TABLE IF NOT EXISTS public.archive_chat_bans (
    user_id     UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    banned_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reason      TEXT,
    until       TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Per-soul per-hall read marker, for unread badges.
CREATE TABLE IF NOT EXISTS public.archive_reads (
    user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel_id    UUID NOT NULL REFERENCES public.archive_channels(id) ON DELETE CASCADE,
    last_read_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, channel_id)
);

-- 1:1 Direct Message conversations. The pair is stored in canonical order
-- (user_lo < user_hi by text) so a conversation is unique regardless of who
-- opened it first.
CREATE TABLE IF NOT EXISTS public.dm_conversations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_lo          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_hi          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dm_conversations_pair_key UNIQUE (user_lo, user_hi),
    CONSTRAINT dm_conversations_order_chk CHECK (user_lo < user_hi)
);

CREATE TABLE IF NOT EXISTS public.dm_messages (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id  UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
    sender_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    content          TEXT NOT NULL,
    read_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- 4. ACCESS PREDICATES (SECURITY DEFINER so they can read gating columns even
--    when the caller cannot see the row through RLS — no recursion)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_chat_banned(_uid UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.archive_chat_bans b
        WHERE b.user_id = _uid AND (b.until IS NULL OR b.until > NOW())
    );
$$;

-- May the caller SEE a hall (and therefore its messages)?
CREATE OR REPLACE FUNCTION public.can_view_channel(_channel_id UUID)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    _access TEXT;
BEGIN
    SELECT access INTO _access FROM public.archive_channels WHERE id = _channel_id;
    IF _access IS NULL THEN
        RETURN true; -- unknown / ungated channel: visible
    END IF;
    IF public.is_sanctum_admin() THEN
        RETURN true; -- Architects see everything
    END IF;
    RETURN CASE _access
        WHEN 'everyone'    THEN true
        WHEN 'supporters'  THEN public.soul_is_supporter()
        WHEN 'architects'  THEN false
        ELSE true
    END;
END;
$$;

-- May the caller POST into a hall right now?
CREATE OR REPLACE FUNCTION public.can_post_channel(_channel_id UUID)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    _locked BOOLEAN;
    _ws UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;
    SELECT locked, workspace_id INTO _locked, _ws FROM public.archive_channels WHERE id = _channel_id;
    -- Architects (by signed email) OR a stamped workspace Admin can post
    -- ANYWHERE, including locked announcement halls. The membership check makes
    -- this robust even if the JWT email claim isn't available on a given request.
    IF public.is_sanctum_admin() OR EXISTS (
        SELECT 1 FROM public.archive_workspace_members m
        WHERE m.user_id = auth.uid() AND m.workspace_id = _ws AND m.role = 'Admin'
    ) THEN
        RETURN true;
    END IF;
    IF NOT public.can_view_channel(_channel_id) THEN
        RETURN false;
    END IF;
    IF public.is_chat_banned(auth.uid()) THEN
        RETURN false;
    END IF;
    RETURN NOT COALESCE(_locked, false);
END;
$$;

-- May the caller change the STRUCTURE of a Sanctum (create/rename/reorder/lock/
-- delete Halls)? Architects (admin email) OR a Moderator/Admin of that
-- workspace. Regular souls never can.
CREATE OR REPLACE FUNCTION public.can_manage_sanctum(_workspace UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT public.is_sanctum_admin() OR EXISTS (
        SELECT 1 FROM public.archive_workspace_members m
        WHERE m.user_id = auth.uid() AND m.workspace_id = _workspace AND m.role IN ('Admin', 'Moderator')
    );
$$;


-- ============================================================================
-- 5. RPCs (membership, roles, DMs, read markers)
-- ============================================================================

-- Join the global Sanctum workspace. Architects are stamped 'Admin'
-- automatically; everyone else keeps their existing role (or becomes 'Member').
CREATE OR REPLACE FUNCTION public.join_sanctum(_workspace UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    INSERT INTO public.archive_workspace_members (user_id, workspace_id, role)
    VALUES (auth.uid(), _workspace, CASE WHEN public.is_sanctum_admin() THEN 'Admin' ELSE 'Member' END)
    ON CONFLICT (user_id, workspace_id) DO UPDATE
        SET role = CASE WHEN public.is_sanctum_admin() THEN 'Admin' ELSE public.archive_workspace_members.role END;
END;
$$;

-- Architect-only: promote / demote a soul within a workspace.
CREATE OR REPLACE FUNCTION public.set_member_role(_uid UUID, _workspace UUID, _role TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NOT public.is_sanctum_admin() THEN
        RAISE EXCEPTION 'Architect power required';
    END IF;
    IF _role NOT IN ('Admin', 'Moderator', 'Member') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;
    INSERT INTO public.archive_workspace_members (user_id, workspace_id, role)
    VALUES (_uid, _workspace, _role)
    ON CONFLICT (user_id, workspace_id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

-- Open (or fetch) the 1:1 conversation between the caller and _other.
CREATE OR REPLACE FUNCTION public.start_dm(_other UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    _me  UUID := auth.uid();
    _lo  UUID;
    _hi  UUID;
    _id  UUID;
BEGIN
    IF _me IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;
    IF _other IS NULL OR _other = _me THEN
        RAISE EXCEPTION 'Invalid recipient';
    END IF;
    IF _me::text < _other::text THEN
        _lo := _me; _hi := _other;
    ELSE
        _lo := _other; _hi := _me;
    END IF;
    INSERT INTO public.dm_conversations (user_lo, user_hi)
    VALUES (_lo, _hi)
    ON CONFLICT (user_lo, user_hi) DO NOTHING;
    SELECT id INTO _id FROM public.dm_conversations WHERE user_lo = _lo AND user_hi = _hi;
    RETURN _id;
END;
$$;

-- Mark a hall as read up to now (for unread badges).
CREATE OR REPLACE FUNCTION public.mark_channel_read(_channel UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN RETURN; END IF;
    INSERT INTO public.archive_reads (user_id, channel_id, last_read_at)
    VALUES (auth.uid(), _channel, NOW())
    ON CONFLICT (user_id, channel_id) DO UPDATE SET last_read_at = NOW();
END;
$$;

-- Staff (Architects + workspace Moderators) pin / unpin any message. Done via
-- an RPC (not a broad UPDATE policy) so mods can pin WITHOUT gaining the power
-- to edit other souls' message text.
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

GRANT EXECUTE ON FUNCTION public.join_sanctum(UUID)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_dm(UUID)                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_channel_read(UUID)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_message_pin(UUID, BOOLEAN)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_channel(UUID)          TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_post_channel(UUID)          TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_chat_banned(UUID)            TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_sanctum_admin()             TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.soul_is_supporter()            TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_sanctum(UUID)       TO authenticated, anon;


-- ============================================================================
-- 6. TRIGGERS
-- ============================================================================

-- Bump a conversation's last_message_at whenever a DM lands (drives inbox sort).
CREATE OR REPLACE FUNCTION public.bump_dm_conversation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    UPDATE public.dm_conversations SET last_message_at = NOW() WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_dm_conversation ON public.dm_messages;
CREATE TRIGGER trg_bump_dm_conversation
    AFTER INSERT ON public.dm_messages
    FOR EACH ROW EXECUTE FUNCTION public.bump_dm_conversation();

-- Re-assert the archive message modtime trigger (marks is_edited on content change).
CREATE OR REPLACE FUNCTION public.update_archive_message_modtime()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.is_edited = true;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_archive_message_modtime ON public.archive_messages;
CREATE TRIGGER trigger_archive_message_modtime
    BEFORE UPDATE ON public.archive_messages
    FOR EACH ROW
    WHEN (OLD.content IS DISTINCT FROM NEW.content)
    EXECUTE FUNCTION public.update_archive_message_modtime();


-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.archive_workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_channels          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_reactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_chat_bans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archive_reads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_conversations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages               ENABLE ROW LEVEL SECURITY;

-- ---- Workspaces ----
DROP POLICY IF EXISTS "Workspaces are viewable by everyone" ON public.archive_workspaces;
CREATE POLICY "Workspaces are viewable by everyone" ON public.archive_workspaces FOR SELECT USING (true);
DROP POLICY IF EXISTS "Architects manage workspaces" ON public.archive_workspaces;
CREATE POLICY "Architects manage workspaces" ON public.archive_workspaces FOR ALL
    USING (public.is_sanctum_admin()) WITH CHECK (public.is_sanctum_admin());

-- ---- Channels (Halls) ----
DROP POLICY IF EXISTS "Channels are viewable by everyone" ON public.archive_channels;
DROP POLICY IF EXISTS "Admins can insert channels" ON public.archive_channels;
DROP POLICY IF EXISTS "Halls are viewable when permitted" ON public.archive_channels;
DROP POLICY IF EXISTS "Architects manage halls" ON public.archive_channels;
DROP POLICY IF EXISTS "Staff manage halls" ON public.archive_channels;
-- Visible only when the gate allows it (hides supporters/architects halls).
CREATE POLICY "Halls are viewable when permitted" ON public.archive_channels FOR SELECT
    USING (public.can_view_channel(id));
-- STAFF (Architects + workspace Moderators) create / rename / reorder / lock /
-- delete halls. Regular souls can't change the Sanctum's structure.
CREATE POLICY "Staff manage halls" ON public.archive_channels FOR ALL
    USING (public.can_manage_sanctum(workspace_id)) WITH CHECK (public.can_manage_sanctum(workspace_id));

-- ---- Workspace Members ----
DROP POLICY IF EXISTS "Members are viewable by everyone" ON public.archive_workspace_members;
DROP POLICY IF EXISTS "Souls can join as member" ON public.archive_workspace_members;
DROP POLICY IF EXISTS "Architects manage members" ON public.archive_workspace_members;
CREATE POLICY "Members are viewable by everyone" ON public.archive_workspace_members FOR SELECT USING (true);
CREATE POLICY "Souls can join as member" ON public.archive_workspace_members FOR INSERT
    WITH CHECK (auth.uid() = user_id AND role = 'Member');
CREATE POLICY "Architects manage members" ON public.archive_workspace_members FOR ALL
    USING (public.is_sanctum_admin()) WITH CHECK (public.is_sanctum_admin());

-- ---- Messages ----
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON public.archive_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.archive_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.archive_messages;
DROP POLICY IF EXISTS "Users can edit own messages" ON public.archive_messages;
DROP POLICY IF EXISTS "Hall messages are viewable when permitted" ON public.archive_messages;
DROP POLICY IF EXISTS "Souls can send messages where allowed" ON public.archive_messages;
DROP POLICY IF EXISTS "Authors edit own messages" ON public.archive_messages;
DROP POLICY IF EXISTS "Architects manage any message" ON public.archive_messages;
DROP POLICY IF EXISTS "Delete own or moderated messages" ON public.archive_messages;

CREATE POLICY "Hall messages are viewable when permitted" ON public.archive_messages FOR SELECT
    USING (public.can_view_channel(channel_id));

CREATE POLICY "Souls can send messages where allowed" ON public.archive_messages FOR INSERT
    WITH CHECK (auth.uid() = author_id AND public.can_post_channel(channel_id));

-- Authors edit their own message text.
CREATE POLICY "Authors edit own messages" ON public.archive_messages FOR UPDATE
    USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- Architects may update any message (e.g. pin/unpin).
CREATE POLICY "Architects manage any message" ON public.archive_messages FOR UPDATE
    USING (public.is_sanctum_admin()) WITH CHECK (public.is_sanctum_admin());

-- Delete: own message, OR Architect, OR a Moderator of the message's workspace.
CREATE POLICY "Delete own or moderated messages" ON public.archive_messages FOR DELETE
    USING (
        auth.uid() = author_id
        OR public.is_sanctum_admin()
        OR EXISTS (
            SELECT 1
            FROM public.archive_workspace_members m
            JOIN public.archive_channels c ON c.workspace_id = m.workspace_id
            WHERE c.id = archive_messages.channel_id
              AND m.user_id = auth.uid()
              AND m.role IN ('Admin', 'Moderator')
        )
    );

-- ---- Reactions ----
DROP POLICY IF EXISTS "Reactions are viewable when hall is" ON public.archive_reactions;
DROP POLICY IF EXISTS "Souls react where they can view" ON public.archive_reactions;
DROP POLICY IF EXISTS "Souls remove own reactions" ON public.archive_reactions;
CREATE POLICY "Reactions are viewable when hall is" ON public.archive_reactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.archive_messages msg
        WHERE msg.id = archive_reactions.message_id AND public.can_view_channel(msg.channel_id)
    ));
CREATE POLICY "Souls react where they can view" ON public.archive_reactions FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND NOT public.is_chat_banned(auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.archive_messages msg
            WHERE msg.id = archive_reactions.message_id AND public.can_view_channel(msg.channel_id)
        )
    );
CREATE POLICY "Souls remove own reactions" ON public.archive_reactions FOR DELETE
    USING (auth.uid() = user_id);

-- ---- Chat bans ----
DROP POLICY IF EXISTS "Chat bans are readable" ON public.archive_chat_bans;
DROP POLICY IF EXISTS "Architects manage chat bans" ON public.archive_chat_bans;
CREATE POLICY "Chat bans are readable" ON public.archive_chat_bans FOR SELECT USING (true);
CREATE POLICY "Architects manage chat bans" ON public.archive_chat_bans FOR ALL
    USING (public.is_sanctum_admin()) WITH CHECK (public.is_sanctum_admin());

-- ---- Read markers ----
DROP POLICY IF EXISTS "Souls manage own read markers" ON public.archive_reads;
CREATE POLICY "Souls manage own read markers" ON public.archive_reads FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---- DM conversations ----
-- Participants may READ their own conversations. There is deliberately NO direct
-- INSERT / UPDATE / DELETE policy: conversations are created ONLY through
-- start_dm() (SECURITY DEFINER, which canonicalises the pair and validates the
-- caller), and last_message_at is bumped by the SECURITY DEFINER trigger. With
-- RLS enabled and no write policy, every direct client write is denied — so a
-- client cannot forge a conversation row, reorder the pair, or delete a thread.
DROP POLICY IF EXISTS "Participants see their conversations" ON public.dm_conversations;
DROP POLICY IF EXISTS "Participants open conversations" ON public.dm_conversations;
CREATE POLICY "Participants see their conversations" ON public.dm_conversations FOR SELECT
    USING (auth.uid() = user_lo OR auth.uid() = user_hi);

-- ---- DM messages ----
DROP POLICY IF EXISTS "Participants read DMs" ON public.dm_messages;
DROP POLICY IF EXISTS "Participants send DMs" ON public.dm_messages;
DROP POLICY IF EXISTS "Participants mark DMs read" ON public.dm_messages;
CREATE POLICY "Participants read DMs" ON public.dm_messages FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.dm_conversations c
        WHERE c.id = dm_messages.conversation_id AND (auth.uid() = c.user_lo OR auth.uid() = c.user_hi)
    ));
CREATE POLICY "Participants send DMs" ON public.dm_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.dm_conversations c
            WHERE c.id = dm_messages.conversation_id AND (auth.uid() = c.user_lo OR auth.uid() = c.user_hi)
        )
    );
-- Either participant may stamp read_at (mark a thread as read).
CREATE POLICY "Participants mark DMs read" ON public.dm_messages FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.dm_conversations c
        WHERE c.id = dm_messages.conversation_id AND (auth.uid() = c.user_lo OR auth.uid() = c.user_hi)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.dm_conversations c
        WHERE c.id = dm_messages.conversation_id AND (auth.uid() = c.user_lo OR auth.uid() = c.user_hi)
    ));


-- ============================================================================
-- 8. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS archive_channels_workspace_idx ON public.archive_channels (workspace_id, position);
CREATE INDEX IF NOT EXISTS archive_messages_channel_idx   ON public.archive_messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS archive_messages_pinned_idx     ON public.archive_messages (channel_id) WHERE pinned;
CREATE INDEX IF NOT EXISTS archive_reactions_message_idx   ON public.archive_reactions (message_id);
CREATE INDEX IF NOT EXISTS dm_messages_conversation_idx    ON public.dm_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS dm_conversations_lo_idx         ON public.dm_conversations (user_lo, last_message_at DESC);
CREATE INDEX IF NOT EXISTS dm_conversations_hi_idx         ON public.dm_conversations (user_hi, last_message_at DESC);


-- ============================================================================
-- 9. REALTIME (publication + replica identity for DELETE/UPDATE payloads)
-- ============================================================================
DO $$
DECLARE
    t TEXT;
    -- dm_conversations is intentionally NOT published: the client never
    -- subscribes to it (the inbox is driven by dm_messages events + start_dm),
    -- so publishing it would only widen the realtime surface for no benefit.
    tbls TEXT[] := ARRAY[
        'archive_channels', 'archive_messages', 'archive_reactions',
        'archive_chat_bans', 'dm_messages'
    ];
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        FOREACH t IN ARRAY tbls LOOP
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables
                WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
            END IF;
        END LOOP;
    END IF;
END $$;

-- Full row image so realtime DELETE/UPDATE events carry the keys we filter on.
ALTER TABLE public.archive_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.archive_chat_bans REPLICA IDENTITY FULL;
ALTER TABLE public.archive_messages  REPLICA IDENTITY FULL;
ALTER TABLE public.dm_messages       REPLICA IDENTITY FULL;


-- ============================================================================
-- 10. SEED — the global Sanctum + its themed Halls
-- ============================================================================
INSERT INTO public.archive_workspaces (id, name)
VALUES ('00000000-0000-0000-0000-000000000000', 'The Sanctum')
ON CONFLICT (id) DO NOTHING;

-- Tidy any pre-existing seed channels into the new category/ordering scheme.
UPDATE public.archive_channels SET category = 'The Commons', position = 10
    WHERE workspace_id = '00000000-0000-0000-0000-000000000000' AND name = 'general' AND category IS NULL;
UPDATE public.archive_channels SET category = 'Welcome', position = 1, locked = true
    WHERE workspace_id = '00000000-0000-0000-0000-000000000000' AND name = 'announcements';

-- Retired Halls — drop the Inner Sanctum (supporters/architects) and #the-path
-- if a prior run created them (self-healing; messages cascade-delete).
DELETE FROM public.archive_channels
    WHERE workspace_id = '00000000-0000-0000-0000-000000000000'
      AND name IN ('the-path', 'supporters-lounge', 'architects-table');

-- Insert the themed seed Halls only when absent (no unique key on name, so guard
-- each insert explicitly to stay idempotent).
DO $$
DECLARE
    ws UUID := '00000000-0000-0000-0000-000000000000';
    seed RECORD;
BEGIN
    FOR seed IN
        SELECT * FROM (VALUES
            ('welcome',       'text', 'Welcome', 0,  true,  'everyone',   'Orientation for every soul who enters'),
            ('announcements', 'text', 'Welcome', 1,  true,  'everyone',   'Official transmissions from the Architects'),
            ('general',       'text', 'The Commons', 10, false, 'everyone', 'Open frequency for all souls'),
            ('testimonies',   'text', 'The Commons', 12, false, 'everyone', 'Bear witness — what has shifted within you'),
            ('support',       'text', 'The Commons', 13, false, 'everyone', 'Ask for guidance; lift one another')
        ) AS s(name, type, category, position, locked, access, topic)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM public.archive_channels
            WHERE workspace_id = ws AND name = seed.name
        ) THEN
            INSERT INTO public.archive_channels (workspace_id, name, type, category, position, locked, access, topic)
            VALUES (ws, seed.name, seed.type, seed.category, seed.position, seed.locked, seed.access, seed.topic);
        END IF;
    END LOOP;
END $$;

-- Seed a pinned welcome message into #welcome (only if the hall has none yet).
-- Authored by an Architect if one already has a profile, else left author-less.
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

-- ============================================================================
--  DONE. After running: every existing soul will be auto-joined to The Sanctum
--  on their next visit (via join_sanctum), and Architect emails are stamped
--  with the Admin role automatically.
-- ============================================================================
