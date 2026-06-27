-- ============================================================================
--  REPAIR PROFILES GRANTS
--
--  Fixes "permission denied for table profiles" when a signed-in soul edits
--  their own profile (name, bio, status, theme, pronouns, location, links,
--  presence — and avatar if you don't use the server endpoint). This happens
--  when the table-level UPDATE was revoked (secure_profiles_privileges.sql) but
--  the column-level UPDATE grants are missing/incomplete for the `authenticated`
--  role.
--
--  This re-asserts SELECT + the COSMETIC column UPDATE grants only. The
--  privileged columns (tier / soul_power / is_supporter / is_banned) stay
--  LOCKED — they are never granted here, so this does not re-open the
--  privilege-escalation hole that secure_profiles_privileges.sql closed.
--
--  Idempotent. Run once in the Supabase SQL editor.
-- ============================================================================

GRANT SELECT ON public.profiles TO anon, authenticated;

-- The original 6 cosmetic columns (always present).
GRANT UPDATE (display_name, username, avatar_url, bio, custom_title, theme_color)
    ON public.profiles TO authenticated;

-- The richer community columns (present after community_schema.sql). If any are
-- missing, run community_schema.sql first, then re-run this line.
GRANT UPDATE (banner_url, pronouns, location, status, links, last_seen_at)
    ON public.profiles TO authenticated;
