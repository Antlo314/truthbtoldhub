-- ==========================================
-- SYSTEM SETTINGS: GLOBAL CONTROL
-- ==========================================

-- 1. Create the system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    broadcast_message TEXT DEFAULT 'The initial architecture is stabilizing...',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure only one row ever exists
    CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Insert the default row if it doesn't exist
INSERT INTO system_settings (id, broadcast_message) 
VALUES (1, 'The initial architecture is stabilizing...')
ON CONFLICT (id) DO NOTHING;

-- 3. Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Anyone can read the broadcast
CREATE POLICY "Anyone can view system settings" 
ON system_settings FOR SELECT 
USING (true);

-- Only Architects OR the specific Admin UID can update
-- (We'll use a simplified check using the profiles table, 
--  but to be safe, we also allow the service role or authenticated users to update if they are an Architect)
CREATE POLICY "Only Architects can update system settings" 
ON system_settings FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND tier = 'Architect'
    )
);

-- 5. Trigger to auto-update the timestamp
CREATE OR REPLACE FUNCTION update_system_settings_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_system_settings_modtime ON system_settings;
CREATE TRIGGER trigger_system_settings_modtime
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_modtime();
