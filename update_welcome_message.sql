-- ============================================================================
--  SANCTUM WELCOME MESSAGE — put the FULL welcome + house rules (the same text
--  as the first-visit popup) as the pinned message in #welcome. Replaces any
--  existing #welcome messages. Idempotent. Run once in the Supabase SQL editor.
-- ============================================================================
DO $$
DECLARE
    ws  UUID := '00000000-0000-0000-0000-000000000000';
    wid UUID;
    aid UUID;
BEGIN
    SELECT id INTO wid FROM public.archive_channels WHERE workspace_id = ws AND name = 'welcome' LIMIT 1;
    SELECT id INTO aid FROM public.profiles WHERE email IN ('iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com') ORDER BY created_at LIMIT 1;
    IF wid IS NOT NULL THEN
        DELETE FROM public.archive_messages WHERE channel_id = wid;
        INSERT INTO public.archive_messages (channel_id, author_id, content, pinned, pinned_by, pinned_at)
        VALUES (
            wid, aid,
            E'Welcome to The Sanctum. \U0001F54A️\n\nA gathering place for every soul on the journey — live halls, whispers, and voice. Speak freely, and walk in good faith.\n\n— THE SANCTUM CODE —\n1. Honor every soul — no harassment, hate, slurs, threats, or personal attacks. We are all on the journey.\n2. Keep it genuine — no spam, scams, raids, or relentless self-promotion. Quality over noise.\n3. Stay on the path — read each hall''s topic and keep conversations where they belong.\n4. Keep it safe — no NSFW, illegal, or harmful content. This is a sanctuary for all ages of soul.\n5. Guard privacy — never share others'' personal information, and never impersonate another soul.\n6. The Architects keep the peace — moderation guidance stands. Disagree? Raise it calmly in a Whisper, not a brawl.\n\nBy entering, you agree to walk these halls in good faith. ✦',
            true, aid, NOW()
        );
    END IF;
END $$;
