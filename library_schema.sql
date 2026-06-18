-- ==========================================
--  THE LIBRARY — document repository (members-only)
--  Architect (admin) uploads documents; logged-in members view/download.
--  Mirrors the archive/codex conventions: UUID PKs, profiles FKs.
--
--  ACCESS MODEL: members-only. Reads (both the metadata rows and the files)
--  require an authenticated session; the bucket is PRIVATE, so files are only
--  reachable via short-lived signed URLs the app mints for logged-in users.
--
--  SECURITY NOTE: write access is gated on the *verified* admin email from the
--  auth JWT — NOT on profiles.tier. profiles.tier is client-writable in this
--  app (the profiles UPDATE policy has no WITH CHECK and useSoulStore forwards
--  arbitrary columns), so a tier='Architect' check would be self-elevatable by
--  any logged-in user. The JWT email claim is signed by Supabase and cannot be
--  spoofed, so it is the trustworthy gate. Keep the email list in sync with
--  lib/adminEmails.ts.
--  Run once in the Supabase SQL editor. Idempotent.
-- ==========================================

-- 0. Admin check — verified admin email from the signed JWT. SECURITY DEFINER
--    so it runs with a stable search_path regardless of caller.
CREATE OR REPLACE FUNCTION public.is_library_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT (auth.jwt() ->> 'email') IN ('iamwhoiambook@gmail.com', 'admin@truthbtoldhub.com');
$$;

-- 1. Document metadata
CREATE TABLE IF NOT EXISTS public.library_documents (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    description TEXT,
    category    TEXT NOT NULL DEFAULT 'General',
    file_path   TEXT NOT NULL,                 -- object key within the 'library' bucket
    file_name   TEXT,                          -- original filename (for downloads)
    file_type   TEXT,                          -- mime type
    file_size   BIGINT,                        -- bytes
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_documents_created ON public.library_documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_library_documents_category ON public.library_documents (category);

-- 2. Row-level security — members read, admin-only writes
ALTER TABLE public.library_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Library is viewable by everyone"  ON public.library_documents;
DROP POLICY IF EXISTS "Library is viewable by members"   ON public.library_documents;
DROP POLICY IF EXISTS "Architects can add documents"     ON public.library_documents;
DROP POLICY IF EXISTS "Architects can update documents"  ON public.library_documents;
DROP POLICY IF EXISTS "Architects can delete documents"  ON public.library_documents;

CREATE POLICY "Library is viewable by members"
    ON public.library_documents FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Architects can add documents"
    ON public.library_documents FOR INSERT WITH CHECK (public.is_library_admin());

CREATE POLICY "Architects can update documents"
    ON public.library_documents FOR UPDATE USING (public.is_library_admin());

CREATE POLICY "Architects can delete documents"
    ON public.library_documents FOR DELETE USING (public.is_library_admin());

-- 3. Storage bucket for the files themselves — PRIVATE (signed-URL access), 50 MB cap
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('library', 'library', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

-- 4. Storage policies — members can read (mint signed URLs), only the admin can write
DROP POLICY IF EXISTS "Library files are public"            ON storage.objects;
DROP POLICY IF EXISTS "Library files are member-readable"   ON storage.objects;
DROP POLICY IF EXISTS "Architects can upload library files" ON storage.objects;
DROP POLICY IF EXISTS "Architects can update library files" ON storage.objects;
DROP POLICY IF EXISTS "Architects can delete library files" ON storage.objects;

CREATE POLICY "Library files are member-readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'library' AND auth.uid() IS NOT NULL);

CREATE POLICY "Architects can upload library files"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'library' AND public.is_library_admin());

CREATE POLICY "Architects can update library files"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'library' AND public.is_library_admin());

CREATE POLICY "Architects can delete library files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'library' AND public.is_library_admin());
