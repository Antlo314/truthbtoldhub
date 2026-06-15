-- ==========================================
--  TRUTH'S HUT — living daily content
--  Run once in the Supabase SQL editor.
--  ALSO: in Storage, create a PUBLIC bucket named  dispatches
--  (Dashboard -> Storage -> New bucket -> name "dispatches", Public ON).
-- ==========================================

-- 1) BULLETINS (Truth's daily word)
create table if not exists public.bulletins (
    id           uuid primary key default gen_random_uuid(),
    title        text not null,
    body         text not null default '',
    pinned       boolean not null default false,
    published_at date not null default current_date,
    created_at   timestamptz not null default now()
);

-- 2) DISPATCH MEDIA (downloadable PDFs / MP4s / MP3s / images)
create table if not exists public.dispatch_media (
    id           uuid primary key default gen_random_uuid(),
    title        text not null,
    description  text default '',
    kind         text not null default 'pdf' check (kind in ('pdf','video','audio','image','link')),
    url          text not null,
    file_path    text,
    size_bytes   bigint default 0,
    category     text default 'General',
    published_at date not null default current_date,
    created_at   timestamptz not null default now()
);

alter table public.bulletins enable row level security;
alter table public.dispatch_media enable row level security;

-- everyone may read; only Architects may write
do $$
begin
    if not exists (select 1 from pg_policies where tablename='bulletins' and policyname='bulletins public read') then
        create policy "bulletins public read" on public.bulletins for select using (true);
    end if;
    if not exists (select 1 from pg_policies where tablename='bulletins' and policyname='bulletins architect write') then
        create policy "bulletins architect write" on public.bulletins for all
            using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tier = 'Architect'))
            with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tier = 'Architect'));
    end if;
    if not exists (select 1 from pg_policies where tablename='dispatch_media' and policyname='media public read') then
        create policy "media public read" on public.dispatch_media for select using (true);
    end if;
    if not exists (select 1 from pg_policies where tablename='dispatch_media' and policyname='media architect write') then
        create policy "media architect write" on public.dispatch_media for all
            using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tier = 'Architect'))
            with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.tier = 'Architect'));
    end if;
end $$;

-- 3) STORAGE policies for the "dispatches" bucket
do $$
begin
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='dispatches public read') then
        create policy "dispatches public read" on storage.objects for select using (bucket_id = 'dispatches');
    end if;
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='dispatches architect write') then
        create policy "dispatches architect write" on storage.objects for insert
            with check (bucket_id = 'dispatches' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.tier = 'Architect'));
    end if;
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='dispatches architect delete') then
        create policy "dispatches architect delete" on storage.objects for delete
            using (bucket_id = 'dispatches' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.tier = 'Architect'));
    end if;
end $$;
