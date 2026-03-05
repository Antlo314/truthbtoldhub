-- ==========================================
-- THE OBSIDIAN VOID: RESET SP & VOTES
-- ==========================================
-- This script safely resets Soul Power to default and clears all petition progress.

-- 1. Reset all profiles to baseline Soul Power (e.g. 100)
UPDATE profiles
SET soul_power = 100;

-- 2. Reset all petition progress back to zero and set status to 'Consensus Building'
UPDATE petitions
SET 
    sp_pledged = 0,
    backer_count = 0,
    consensus_percentage = 0,
    status = 'Consensus Building';

-- 3. Delete any individual votes so users can vote again
DELETE FROM petition_votes;

-- 4. Delete the transaction ledger for a clean slate
DELETE FROM transactions;
