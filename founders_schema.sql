-- ==========================================
--  FOUNDING SEALS — reward the first souls
--  The first 12 / 40 / 144 to sign up earn permanent founder tiers.
--  Run once in the Supabase SQL editor.
-- ==========================================

-- a permanent signup-order number on every profile
alter table public.profiles add column if not exists founder_number integer;

-- race-safe source of new numbers
create sequence if not exists public.founder_seq;

-- backfill existing profiles in signup order (earliest = #1)
with ordered as (
    select id, row_number() over (order by created_at asc nulls last, id asc) as rn
    from public.profiles
)
update public.profiles p
set founder_number = o.rn
from ordered o
where p.id = o.id and p.founder_number is null;

-- advance the sequence past the backfill so new signups continue the count
do $$
declare mx integer;
begin
    select coalesce(max(founder_number), 0) into mx from public.profiles;
    if mx > 0 then
        perform setval('public.founder_seq', mx, true);
    end if;
end $$;

-- every new profile auto-receives the next founding number
alter table public.profiles alter column founder_number set default nextval('public.founder_seq');

-- (optional) index for fast lookups / leaderboards
create index if not exists profiles_founder_number_idx on public.profiles (founder_number);
