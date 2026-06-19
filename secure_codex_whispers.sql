-- ==========================================
--  SECURE codex_whispers — close the open UPDATE policy
-- ==========================================
--  The only UPDATE policy was `USING (auth.role() = 'authenticated')` with no
--  WITH CHECK and no column/row scope, so any logged-in user could overwrite
--  ANY whisper (content, alignment, even author_id) on the public ledger.
--
--  Fix: drop it; let a soul update only its OWN whisper; and route the one
--  legitimate cross-row write — the "decrypt" reveal — through a SECURITY
--  DEFINER RPC that flips ONLY is_encrypted. Alignment already goes through the
--  existing align_whisper RPC. Run once in the Supabase SQL editor. Idempotent.
-- ==========================================

DROP POLICY IF EXISTS "Authenticated users can update whisper alignments" ON public.codex_whispers;
DROP POLICY IF EXISTS "Users can update own whispers" ON public.codex_whispers;

CREATE POLICY "Users can update own whispers" ON public.codex_whispers
    FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

-- Decrypt: reveal a whisper without being able to tamper with anything else.
CREATE OR REPLACE FUNCTION public.decrypt_whisper(whisper_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
    UPDATE public.codex_whispers SET is_encrypted = false WHERE id = whisper_id;
$$;
REVOKE ALL ON FUNCTION public.decrypt_whisper(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decrypt_whisper(uuid) TO authenticated;
