-- ============================================================================
--  SANCTUM STAFF PERMISSIONS — let Moderators (Sentinels), not just Architects,
--  change the Sanctum's STRUCTURE (create / rename / reorder / lock / delete
--  Halls). Regular souls still cannot. Idempotent. Run once in the SQL editor.
--
--  Roles live in archive_workspace_members.role:
--    Admin     = Architect (also stamped for admin emails on join)
--    Moderator = Sentinel  (promote a soul via the profile popout → "Make Sentinel")
--    Member    = Soul
-- ============================================================================

-- Predicate: may the caller manage this workspace's structure?
CREATE OR REPLACE FUNCTION public.can_manage_sanctum(_workspace UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT public.is_sanctum_admin() OR EXISTS (
        SELECT 1 FROM public.archive_workspace_members m
        WHERE m.user_id = auth.uid() AND m.workspace_id = _workspace AND m.role IN ('Admin', 'Moderator')
    );
$$;
GRANT EXECUTE ON FUNCTION public.can_manage_sanctum(UUID) TO authenticated, anon;

-- Swap the Halls management policy from Architect-only to staff (mods + admins).
DROP POLICY IF EXISTS "Architects manage halls" ON public.archive_channels;
DROP POLICY IF EXISTS "Staff manage halls"      ON public.archive_channels;
CREATE POLICY "Staff manage halls" ON public.archive_channels FOR ALL
    USING (public.can_manage_sanctum(workspace_id))
    WITH CHECK (public.can_manage_sanctum(workspace_id));
