-- 015: name at sign-up, and no unfinished sign-ups left behind (17 Nov 2026).
-- Safe to run again.
--
--   1. The sign-up form now asks for the player's full name first. The name
--      travels with the sign-up and is put straight into the new profile, so
--      no account starts without a name. Google sign-ups bring their Google
--      name the same way.
--   2. Someone who signs up but never confirms their email address cannot
--      log in, and before this their half-made account stayed in the list
--      for ever. Now such accounts are deleted after 7 days, every night.
--      Accounts that confirmed their email are never touched by this.

-- ---------- 1. Name from the sign-up ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  given text := nullif(left(btrim(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    '\s+', ' ', 'g')), 120), '');
begin
  insert into public.profiles (id, email, legal_name)
  values (new.id, lower(new.email), given)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------- 2. Delete sign-ups that were never confirmed ----------
create or replace function public.delete_unconfirmed_accounts(p_days integer default 7)
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  gone integer;
begin
  if p_days is null or p_days < 2 then
    raise exception 'keep unconfirmed accounts at least 2 days';
  end if;
  -- Their profile goes with them (the profile table follows the login table).
  delete from auth.users u
   where u.email_confirmed_at is null
     and u.created_at < now() - make_interval(days => p_days);
  get diagnostics gone = row_count;
  return gone;
end;
$$;
revoke all on function public.delete_unconfirmed_accounts(integer) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.delete_unconfirmed_accounts(integer) to service_role';
  end if;
end $$;

-- Every night at 03:17 (UTC). Needs Supabase's "pg_cron" extension; if it is
-- not switched on, this part says so in the results and changes nothing:
-- Database → Extensions → pg_cron → enable, then run this file again.
do $$
begin
  begin
    create extension if not exists pg_cron with schema pg_catalog;
  exception when others then
    begin
      create extension if not exists pg_cron;
    exception when others then
      raise notice 'Nightly clean-up not scheduled: pg_cron is not available (%). Enable it under Database → Extensions, then run this file again.', sqlerrm;
      return;
    end;
  end;
  execute $cron$select cron.schedule('oc-delete-unconfirmed', '17 3 * * *', 'select public.delete_unconfirmed_accounts(7)')$cron$;
  raise notice 'Nightly clean-up scheduled.';
exception when others then
  raise notice 'Nightly clean-up not scheduled: %', sqlerrm;
end $$;
