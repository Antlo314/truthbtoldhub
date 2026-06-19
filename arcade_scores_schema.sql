-- ==========================================
--  ARCADE SCORES — the Sanctum Arcade leaderboard.
--  One row per game played; the board shows each soul's BEST
--  per game + season. Public-read, insert-as-yourself (same
--  RLS shape as testimonies). Run once in the Supabase SQL editor.
-- ==========================================

create table if not exists public.arcade_scores (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid references auth.users(id) on delete cascade,
    player_name  text not null default 'A soul',
    game         text not null,              -- e.g. 'tetra'
    score        integer not null default 0,
    lines        integer not null default 0,
    level        integer not null default 1,
    season       text not null,              -- 'YYYY-MM' (monthly), or 'all'
    created_at   timestamptz not null default now()
);

alter table public.arcade_scores enable row level security;

do $$
begin
    -- everyone may read the leaderboard
    if not exists (select 1 from pg_policies where tablename='arcade_scores' and policyname='arcade_scores public read') then
        create policy "arcade_scores public read" on public.arcade_scores for select using (true);
    end if;

    -- a signed-in soul may post a score, but only as themselves
    if not exists (select 1 from pg_policies where tablename='arcade_scores' and policyname='arcade_scores insert own') then
        create policy "arcade_scores insert own" on public.arcade_scores for insert
            with check (auth.uid() = user_id);
    end if;

    -- a soul may delete their own runs; Architects may delete any (moderation)
    if not exists (select 1 from pg_policies where tablename='arcade_scores' and policyname='arcade_scores delete own or architect') then
        create policy "arcade_scores delete own or architect" on public.arcade_scores for delete
            using (auth.uid() = user_id
                or exists (select 1 from public.profiles p where p.id = auth.uid() and p.tier = 'Architect'));
    end if;
end $$;

-- fast "top scores for this game + season" reads
create index if not exists arcade_scores_board_idx
    on public.arcade_scores (game, season, score desc);

-- fast "my best" reads
create index if not exists arcade_scores_user_idx
    on public.arcade_scores (user_id, game, season, score desc);
