ALTER TABLE public.petitions ADD COLUMN IF NOT EXISTS sp_goal integer DEFAULT 10000;
ALTER TABLE public.petitions ADD COLUMN IF NOT EXISTS sp_pledged integer DEFAULT 0;
ALTER TABLE public.petitions ADD COLUMN IF NOT EXISTS backer_count integer DEFAULT 0;

