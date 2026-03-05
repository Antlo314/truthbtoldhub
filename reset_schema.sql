-- ==========================================
-- THE OBSIDIAN VOID: GLOBAL SCHEMA RESET
-- ==========================================
-- WARNING: THIS WILL DROP ALL EXISTING TABLES
-- AND RECREATE THE INFRASTRUCTURE FOR THE SANCTUM.
-- ==========================================

-- 1. DROP EXISTING VIEWS
DROP VIEW IF EXISTS view_member_ranks CASCADE;
DROP VIEW IF EXISTS view_soul_power CASCADE;
DROP VIEW IF EXISTS view_vote_counts CASCADE;

-- 2. DROP EXISTING TABLES (Safely)
DROP TABLE IF EXISTS app_settings CASCADE;
-- NOTE: In case member_ranks was previously a table, or someone ran a bad script
DROP TABLE IF EXISTS member_ranks CASCADE;
DROP TABLE IF EXISTS replies CASCADE;
DROP TABLE IF EXISTS suggestions CASCADE;
DROP TABLE IF EXISTS system_announcements CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS vote_cycles CASCADE;
DROP TABLE IF EXISTS codex_whispers CASCADE;

-- ==========================================
-- 3. UPGRADE EXISTING PROFILES (DO NOT DROP)
-- ==========================================
-- We add the new columns needed for the Sanctum to the existing profiles table.
-- If they already exist, this simply does nothing.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tier') THEN
        ALTER TABLE profiles ADD COLUMN tier TEXT DEFAULT 'Initiate' CHECK (tier IN ('Initiate', 'Architect', 'Sovereign'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='soul_power') THEN
        ALTER TABLE profiles ADD COLUMN soul_power BIGINT DEFAULT 100;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_banned') THEN
        ALTER TABLE profiles ADD COLUMN is_banned BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

-- THE POOL: ESCROW BALANCE (Treasury)
-- A single row table to track the global holding
CREATE TABLE treasury_escrow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    balance_usd DECIMAL(12, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'SECURE',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize the Treasury with a baseline
INSERT INTO treasury_escrow (balance_usd) VALUES (4000.00);

-- THE POOL: PETITIONS (Mutual Aid Requests)
CREATE TABLE petitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    amount_requested DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'Consensus Building' CHECK (status IN ('Consensus Building', 'Consensus Reached', 'Disbursed', 'Rejected')),
    consensus_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- THE POOL: CONSENSUS VOTES
CREATE TABLE petition_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    petition_id UUID REFERENCES petitions(id) ON DELETE CASCADE,
    voter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    vote_weight INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(petition_id, voter_id) -- One vote per petition per user
);

-- CINEWORKS: THE VAULT (Video Assets)
CREATE TABLE films (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    duration TEXT NOT NULL, -- e.g., '42:00'
    format TEXT DEFAULT '4K',
    video_url TEXT,
    thumbnail_url TEXT,
    is_premiere BOOLEAN DEFAULT false,
    is_new BOOLEAN DEFAULT true,
    director TEXT DEFAULT 'The Void',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LUMEN WALLET: TRANSACTIONS
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL, -- Positive for minting/earning, negative for spending
    transaction_type TEXT NOT NULL, -- e.g., 'MINT', 'OFFERING', 'PURCHASE'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- THE CODEX: GLOBAL LEDGER
CREATE TABLE codex_whispers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    alignment INTEGER DEFAULT 1,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 4. RLS (Row Level Security) POLICIES
-- ==========================================
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_escrow ENABLE ROW LEVEL SECURITY;
ALTER TABLE petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE petition_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE films ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE codex_whispers ENABLE ROW LEVEL SECURITY;

-- Basic Public Read Policies (Customize as needed)
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Treasury is visible to all." ON treasury_escrow FOR SELECT USING (true);
CREATE POLICY "Petitions are visible to all." ON petitions FOR SELECT USING (true);
CREATE POLICY "Films are visible to all." ON films FOR SELECT USING (true);
CREATE POLICY "Codex whispers are visible to all." ON codex_whispers FOR SELECT USING (true);

-- Codex Write Policies
CREATE POLICY "Users can insert their own whispers" ON codex_whispers FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authenticated users can update whisper alignments" ON codex_whispers FOR UPDATE USING (auth.role() = 'authenticated');

-- User Update Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone.'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile.'
    ) THEN
        CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile.'
    ) THEN
        CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Trigger for updated_at on profiles (Create or Replace)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_modtime ON profiles;
CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
