-- ==========================================================
--  SECURE THE HUT UPLOADS — dispatches bucket + content tables.
--  Run once in the Supabase SQL editor. Idempotent.
--
--  WHY: the Hut admin is granted by VERIFIED EMAIL (lib/adminEmails.ts),
--  but the old policies gated writes on profiles.tier = 'Architect'.
--  profiles.tier is CLIENT-WRITABLE in this app, so a tier check is both
--  (a) self-elevatable by any logged-in user (a real privilege-escalation
--  hole) and (b) the reason uploads can be REJECTED for a real admin whose
--  tier column isn't literally 'Architect'. We switch to the same signed-JWT
--  email gate the Library already uses — it can't be spoofed or self-set.
--
--  ⚠️ VIDEO UPLOADS — SIZE: a bucket file_size_limit can't exceed the PROJECT
--  upload-size limit. If videos still fail after this, raise it in the
--  Dashboard: Project Settings → Storage → "Upload file size limit"
--  (free tier caps at 50 MB per file; paid plans allow much larger).
-- ==========================================================

-- 0) Verified-admin gate from the signed JWT email (NOT profiles.tier).
--    Keep the email list in sync with lib/adminEmails.ts.
create or replace function public.is_hub_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
    select (auth.jwt() ->> 'email') in ('iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com');
$$;

-- 1) The "dispatches" bucket: PUBLIC (read), generous size cap, all media types.
--    (allowed_mime_types = null → no MIME restriction; the admin-only write
--    policy below is the real security boundary, so video/* is never blocked.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dispatches', 'dispatches', true, 524288000, null)   -- 500 MB
on conflict (id) do update set public = true, file_size_limit = 524288000, allowed_mime_types = null;

-- 2) Storage policies for the bucket — public read, ADMIN-EMAIL write/delete.
drop policy if exists "dispatches public read"     on storage.objects;
drop policy if exists "dispatches architect write"  on storage.objects;  -- old tier-based
drop policy if exists "dispatches architect delete" on storage.objects;  -- old tier-based
drop policy if exists "dispatches admin insert"     on storage.objects;
drop policy if exists "dispatches admin update"     on storage.objects;
drop policy if exists "dispatches admin delete"     on storage.objects;

create policy "dispatches public read" on storage.objects
    for select using (bucket_id = 'dispatches');
create policy "dispatches admin insert" on storage.objects
    for insert with check (bucket_id = 'dispatches' and public.is_hub_admin());
create policy "dispatches admin update" on storage.objects
    for update using (bucket_id = 'dispatches' and public.is_hub_admin());
create policy "dispatches admin delete" on storage.objects
    for delete using (bucket_id = 'dispatches' and public.is_hub_admin());

-- 3) Content TABLE policies — public read stays; writes move to the email gate
--    (the dispatch_media row insert was ALSO tier-gated, so it could block the
--    metadata save even when the file uploaded).
drop policy if exists "bulletins architect write" on public.bulletins;
drop policy if exists "bulletins admin write"      on public.bulletins;
create policy "bulletins admin write" on public.bulletins for all
    using (public.is_hub_admin()) with check (public.is_hub_admin());

drop policy if exists "media architect write" on public.dispatch_media;
drop policy if exists "media admin write"     on public.dispatch_media;
create policy "media admin write" on public.dispatch_media for all
    using (public.is_hub_admin()) with check (public.is_hub_admin());

-- ==========================================================
-- 4) AVATARS bucket hardening — user profile pictures.
--    Public read; any signed-in soul may upload their own; owner-only edit/
--    delete; 5 MB image-only cap (blocks oversized / non-image uploads).
-- ==========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880,
        array['image/png','image/jpeg','image/webp','image/gif','image/avif','image/heic','image/heif'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
        allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif','image/avif','image/heic','image/heif'];

drop policy if exists "avatars public read"  on storage.objects;
drop policy if exists "avatars auth insert"  on storage.objects;
drop policy if exists "avatars owner update" on storage.objects;
drop policy if exists "avatars owner delete" on storage.objects;

create policy "avatars public read" on storage.objects
    for select using (bucket_id = 'avatars');
create policy "avatars auth insert" on storage.objects
    for insert with check (bucket_id = 'avatars' and auth.uid() is not null);
create policy "avatars owner update" on storage.objects
    for update using (bucket_id = 'avatars' and owner = auth.uid());
create policy "avatars owner delete" on storage.objects
    for delete using (bucket_id = 'avatars' and owner = auth.uid());
