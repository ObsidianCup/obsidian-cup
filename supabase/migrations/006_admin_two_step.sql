-- =====================================================================
-- Obsidian Cup — 006: organiser powers need two-step login
-- Safe to re-run. Run after 005_choose_code_and_code_login.sql.
--
-- An organiser's account can see every player's data, so a stolen password
-- alone must not be enough. Admin powers now need the login to have passed a
-- second step (a 6-digit code from an authenticator app such as Google
-- Authenticator): Supabase marks such logins "aal2" inside the login token,
-- and the database checks that mark. The admin page walks the organiser
-- through setting this up the first time.
--
-- Lost phone? In the SQL Editor:
--   delete from auth.mfa_factors where user_id =
--     (select id from auth.users where email = 'obsidiancup.official@gmail.com');
-- then set it up again on the admin page.
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (
       select 1
       from auth.users u
       join public.admins a on a.email = lower(u.email)
       where u.id = auth.uid()
         and u.email_confirmed_at is not null
     );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- For the admin page only: "is this an organiser's email?" (before the second
-- step), so it knows to ask for the code. Gives no access to anything.
create or replace function public.is_admin_email()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.admins a on a.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_admin_email() from public, anon;
grant execute on function public.is_admin_email() to authenticated;
