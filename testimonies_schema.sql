-- ==========================================
--  TESTIMONIES — the souls' async wall in Truth's Hut.
--  Short posts beneath the daily Word. NOT live chat.
--  Run once in the Supabase SQL editor.
-- ==========================================

create table if not exists public.testimonies (
    id          uuid primary key default gen_random_uuid(),
    author_id   uuid references auth.users(id) on delete set null,
    author_name text not null default 'A soul',
    body        text not null,
    hidden      boolean not null default false,
    created_at  timestamptz not null default now()
);

alter table public.testimonies enable row level security;

do $$
begin
    -- everyone reads visible testimonies
    if not exists (select 1 from pg_policies where tablename='testimonies' and policyname='testimonies public read') then
        create policy "testimonies public read" on public.testimonies for select using (hidden = false);
    end if;
    -- a signed-in soul may post, but only as themselves
    if not exists (select 1 from pg_policies where tablename='testimonies' and policyname='testimonies insert own') then
        create policy "testimonies insert own" on public.testimonies for insert
            with check (auth.uid() = author_id);
    end if;
    -- a soul may remove their own; Architects may remove any (moderation)
    if not exists (select 1 from pg_policies where tablename='testimonies' and policyname='testimonies delete own or architect') then
        create policy "testimonies delete own or architect" on public.testimonies for delete
            using (auth.uid() = author_id
                or exists (select 1 from public.profiles p where p.id = auth.uid() and p.tier = 'Architect'));
    end if;
    -- Architects may hide/unhide for moderation
    if not exists (select 1 from pg_policies where tablename='testimonies' and policyname='testimonies architect update') then
        create policy "testimonies architect update" on public.testimonies for update
            using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tier = 'Architect'));
    end if;
end $$;

create index if not exists testimonies_created_idx on public.testimonies (created_at desc);
