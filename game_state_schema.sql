-- ==========================================
-- THE JOURNEY: per-user game state
-- Run this once in the Supabase SQL editor.
-- Holds each soul's character, path, inventory, and progress as JSON
-- so we can expand the shape without further migrations.
-- ==========================================

create table if not exists public.game_state (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    character  jsonb       not null default '{}'::jsonb,
    initiated  boolean     not null default false,
    updated_at timestamptz not null default now()
);

alter table public.game_state enable row level security;

-- Each soul can only see and write its own row.
do $$
begin
    if not exists (select 1 from pg_policies where tablename='game_state' and policyname='Users read own game_state') then
        create policy "Users read own game_state" on public.game_state
            for select using (auth.uid() = user_id);
    end if;

    if not exists (select 1 from pg_policies where tablename='game_state' and policyname='Users insert own game_state') then
        create policy "Users insert own game_state" on public.game_state
            for insert with check (auth.uid() = user_id);
    end if;

    if not exists (select 1 from pg_policies where tablename='game_state' and policyname='Users update own game_state') then
        create policy "Users update own game_state" on public.game_state
            for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
    end if;
end $$;
