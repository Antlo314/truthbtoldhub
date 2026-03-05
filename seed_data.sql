-- ==========================================
-- THE OBSIDIAN VOID: DEMONSTRATION SEED DATA
-- ==========================================

-- CINEWORKS: THE GALLERY (Video Assets)
INSERT INTO films (title, duration, format, video_url, thumbnail_url, is_premiere, is_new, director)
VALUES 
    ('AWAKENING', '03:14', '1080p', 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.mp4', 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_gallery.png', true, true, 'The Void'),
    ('THE OFFERING', '05:22', '4K', null, 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_codex.png', false, false, 'The Void'),
    ('ECHOES OF ZION', '12:05', '4K', null, 'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/encrypted_sector.png', false, false, 'The Void');

-- THE POOL: PETITIONS (Mutual Aid Requests)
-- We'll link these to a user if possible, or just insert the text.
-- Since requester_id must be a UUID from profiles, we will pull the first profile UUID found or fall back on an anonymous insert (if RLS allows, but our schema requires requester_id references profiles(id)).
-- DO $$
-- DECLARE
--     first_profile_id UUID;
-- BEGIN
--     SELECT id INTO first_profile_id FROM profiles LIMIT 1;
-- 
--     IF first_profile_id IS NOT NULL THEN
--         INSERT INTO petitions (requester_id, title, description, amount_requested, status, consensus_percentage)
--         VALUES 
--             (first_profile_id, 'Equipment Grant: Studio Upgrade', 'Need resources for audio hardware.', 850.00, 'Consensus Building', 18),
--             (first_profile_id, 'Emergency Medical Fund', 'Assistance for unexpected hospital bill.', 1200.00, 'Disbursed', 100);
--     END IF;
-- END $$;
