-- ==========================================
-- THE ARCHIVE: DISCORD-STYLE CHAT SCHEMA
-- ==========================================

DROP TABLE IF EXISTS archive_messages CASCADE;
DROP TABLE IF EXISTS archive_workspace_members CASCADE;
DROP TABLE IF EXISTS archive_channels CASCADE;
DROP TABLE IF EXISTS archive_workspaces CASCADE;

-- 1. Workspaces (Servers)
CREATE TABLE IF NOT EXISTS archive_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Channels (Inside a Workspace)
CREATE TABLE IF NOT EXISTS archive_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES archive_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice')),
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Workspace Members (Roles and Presence Tracking helpers)
CREATE TABLE IF NOT EXISTS archive_workspace_members (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES archive_workspaces(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Member' CHECK (role IN ('Admin', 'Moderator', 'Member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, workspace_id)
);

-- 4. Messages (Core chat)
CREATE TABLE IF NOT EXISTS archive_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES archive_channels(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    reply_to_id UUID REFERENCES archive_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: DMs will be handled by a global workspace ID=null or a dedicated archive_dms table if preferred.
-- For now, we can create private channels for DMs.

-- 5. RLS Policies
ALTER TABLE archive_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_messages ENABLE ROW LEVEL SECURITY;

-- Workspace Policies: Visible to all, or only members. For public servers, viewable by all.
CREATE POLICY "Workspaces are viewable by everyone" ON archive_workspaces FOR SELECT USING (true);

-- Channel Policies
CREATE POLICY "Channels are viewable by everyone" ON archive_channels FOR SELECT USING (true);
CREATE POLICY "Admins can insert channels" ON archive_channels FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM archive_workspace_members
        WHERE user_id = auth.uid() AND workspace_id = archive_channels.workspace_id AND role = 'Admin'
    )
);

-- Messages Policies
CREATE POLICY "Messages are viewable by everyone" ON archive_messages FOR SELECT USING (true);

-- Users can insert their own messages
CREATE POLICY "Users can send messages" ON archive_messages FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Users can delete their own messages or Admins/Moderators can delete any message
CREATE POLICY "Users can delete own messages" ON archive_messages FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (
        SELECT 1 FROM archive_workspace_members m
        JOIN archive_channels c ON c.workspace_id = m.workspace_id
        WHERE c.id = archive_messages.channel_id AND m.user_id = auth.uid() AND m.role IN ('Admin', 'Moderator')
    )
);

-- Users can edit their own messages
CREATE POLICY "Users can edit own messages" ON archive_messages FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- Trigger for updated_at on messages
CREATE OR REPLACE FUNCTION update_archive_message_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.is_edited = true;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_archive_message_modtime ON archive_messages;
CREATE TRIGGER trigger_archive_message_modtime
    BEFORE UPDATE ON archive_messages
    FOR EACH ROW
    WHEN (OLD.content IS DISTINCT FROM NEW.content)
    EXECUTE FUNCTION update_archive_message_modtime();

-- Initial Seed Data: A Defualt Global Workspace and Channels
INSERT INTO archive_workspaces (id, name) VALUES ('00000000-0000-0000-0000-000000000000', 'Sanctum Global') ON CONFLICT DO NOTHING;
INSERT INTO archive_channels (workspace_id, name, type, topic) VALUES 
('00000000-0000-0000-0000-000000000000', 'general', 'text', 'Global frequency for all Architects and Initiates'),
('00000000-0000-0000-0000-000000000000', 'announcements', 'text', 'Official transmissions from the Void'),
('00000000-0000-0000-0000-000000000000', 'voice-uplink', 'voice', '')
ON CONFLICT DO NOTHING;
