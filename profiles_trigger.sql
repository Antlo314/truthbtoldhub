-- ==========================================
--  AUTO-CREATE A PROFILE FOR EVERY NEW SOUL
--  Covers ALL sign-up methods (email, Google OAuth, future providers).
--  Without this, OAuth users get an auth.users row but no profiles row.
--  Pulls name from Google's metadata; founder_number is auto-assigned by
--  founders_schema.sql's default. Idempotent + safe alongside the email
--  path's manual insert (on conflict do nothing). Run once in SQL editor.
-- ==========================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, username, display_name, tier, soul_power)
    values (
        new.id,
        new.email,
        coalesce(
            new.raw_user_meta_data->>'username',
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name',
            split_part(coalesce(new.email, 'soul'), '@', 1)
        ),
        coalesce(
            new.raw_user_meta_data->>'display_name',
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name',
            split_part(coalesce(new.email, 'soul'), '@', 1)
        ),
        'Initiate',
        100
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
