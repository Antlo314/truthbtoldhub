-- ==========================================
--  SECURE PROFILES — lock privileged columns
-- ==========================================
--  Closes a high-severity privilege-escalation hole: any logged-in soul could
--  set their OWN profiles.tier = 'Architect' (or soul_power / is_supporter /
--  is_banned) straight from the browser via the anon client, defeating every
--  tier-based RLS gate in the app (codex deletes, hut writes, etc.).
--
--  Root cause was threefold:
--    * the profiles UPDATE policy had a USING but NO WITH CHECK,
--    * the anon/authenticated roles held a blanket table-level UPDATE, and
--    * the client store forwarded arbitrary columns through that UPDATE.
--
--  This migration is the database half of the fix (the app half hardens the
--  store whitelist and moves tier/soul_power writes to service-role endpoints).
--  Enforcement here is defense-in-depth:
--    1. Column-level UPDATE grants — anon/authenticated may UPDATE only a fixed
--       set of cosmetic columns. Touching tier/soul_power/etc. now raises
--       "permission denied for column".
--    2. A BEFORE INSERT/UPDATE trigger that, for the anon/authenticated roles,
--       forbids changing privileged columns on UPDATE and forces them to safe
--       defaults on INSERT. (A plain RLS WITH CHECK can't compare OLD vs NEW,
--       so the trigger is the authoritative OLD-vs-NEW guard, and it also
--       backstops the INSERT path the column grants don't cover.)
--    3. A WITH CHECK on the UPDATE policy so a row can't be re-owned.
--
--  service_role (server APIs: /api/admin, /api/stripe/webhook,
--  /api/treasury/pledge) and the SECURITY DEFINER signup trigger
--  (public.handle_new_user) run as a role OTHER than anon/authenticated, so
--  every legitimate server-side write keeps working untouched.
--
--  Mirrors the reasoning already documented in library_schema.sql, which chose
--  to gate on the verified JWT email precisely because profiles.tier was
--  client-writable. After this migration that is no longer true.
--
--  Run once in the Supabase SQL editor. Idempotent.
-- ==========================================

-- 1. COLUMN-LEVEL UPDATE PRIVILEGES -------------------------------------------
--    Hand authenticated UPDATE on only the cosmetic columns a soul may
--    self-edit, THEN revoke the blanket table-level UPDATE both client roles
--    get by default. Granting first is deliberate: if a column name were ever
--    wrong the script aborts BEFORE the revoke, leaving profile edits working
--    rather than stripping all update access. Revoking the table-level grant
--    does not touch these column-level grants. (The modtime trigger still
--    maintains updated_at — trigger-set columns are not subject to the caller's
--    column privileges.)
GRANT UPDATE (display_name, username, avatar_url, bio, custom_title, theme_color)
    ON public.profiles TO authenticated;

REVOKE UPDATE ON public.profiles FROM anon, authenticated;

-- 2. TIGHTEN THE UPDATE RLS POLICY --------------------------------------------
--    Add a WITH CHECK so the post-image must still belong to the same soul; the
--    old policy had USING only, which constrained the pre-image but not the new
--    row.
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. AUTHORITATIVE GUARD TRIGGER ----------------------------------------------
--    The real OLD-vs-NEW enforcement. Only the two client roles are policed;
--    service_role / postgres / SECURITY DEFINER functions pass straight through.
CREATE OR REPLACE FUNCTION public.enforce_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    -- service_role, postgres, and SECURITY DEFINER server functions execute as
    -- a role other than anon/authenticated — let them through untouched.
    IF current_user NOT IN ('anon', 'authenticated') THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- A self-served profile row may never start out privileged. New souls
        -- always begin as an Initiate with the baseline of 100 Soul Power; any
        -- elevation or SP grant must happen server-side afterwards.
        NEW.tier         := 'Initiate';
        NEW.soul_power   := 100;
        NEW.is_supporter := false;
        NEW.is_banned    := false;
        RETURN NEW;
    END IF;

    -- TG_OP = 'UPDATE': privileged columns must be untouched by clients.
    IF NEW.tier         IS DISTINCT FROM OLD.tier
       OR NEW.soul_power   IS DISTINCT FROM OLD.soul_power
       OR NEW.is_supporter IS DISTINCT FROM OLD.is_supporter
       OR NEW.is_banned    IS DISTINCT FROM OLD.is_banned THEN
        RAISE EXCEPTION
            'Not authorized to modify privileged profile columns (tier/soul_power/is_supporter/is_banned).';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_privileges_trg ON public.profiles;
CREATE TRIGGER enforce_profile_privileges_trg
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_profile_privileges();
