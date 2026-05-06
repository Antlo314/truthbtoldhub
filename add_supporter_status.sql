-- Add supporter/donor status to profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_supporter') THEN
        ALTER TABLE profiles ADD COLUMN is_supporter BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='contribution_id') THEN
        ALTER TABLE profiles ADD COLUMN contribution_id TEXT; -- For Stripe tracking
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='aura_color') THEN
        ALTER TABLE profiles ADD COLUMN aura_color TEXT DEFAULT 'Neutral';
    END IF;
END $$;
