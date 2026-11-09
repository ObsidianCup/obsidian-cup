-- 013: players delete their own account.
-- Safe to run again.
--
-- How it works:
--   1. The player asks on the account page: request_account_deletion('DELETE').
--      They must have logged in within the last 15 minutes (a stolen, already
--      open phone cannot do it). Blocked while captain of a team in an event
--      that has not finished, or on a team after the registration deadline
--      (event status 'closed'). Teams in events still open are left.
--   2. 14 days to change their mind: logging in calls cancel_account_deletion().
--   3. The scheduled email job (scripts/email/send-emails.mjs, secret key) asks
--      due_account_deletions(), calls finish_account_deletion() for each one
--      (retires the player code, queues the goodbye email), removes the photo
--      and deletes the login. The profile and team places go with it.
--      Consent records keep the email and are kept (see the Privacy Notice).

alter table public.profiles add column if not exists deletion_requested_at timestamptz;
-- Not in the column grants: only the functions below change it.

-- When did this login happen? Supabase puts each sign-in method and its time
-- in the token ("amr"); it does not change when the token is refreshed.
create or replace function public.login_age_minutes()
returns numeric
language sql stable set search_path = ''
as $$
  select (extract(epoch from now()) - max((m->>'timestamp')::numeric)) / 60
  from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) m
  where m ? 'timestamp';
$$;
revoke all on function public.login_age_minutes() from public, anon;
grant execute on function public.login_age_minutes() to authenticated;

create or replace function public.request_account_deletion(p_confirm text)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
  me public.profiles;
  age numeric;
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  if p_confirm is distinct from 'DELETE' then raise exception 'confirm_word'; end if;
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'not_logged_in'; end if;
  if me.deletion_requested_at is not null then
    return me.deletion_requested_at + interval '14 days';
  end if;

  age := public.login_age_minutes();
  if age is null or age > 15 then raise exception 'login_again'; end if;

  if exists (select 1 from public.teams t join public.events e on e.id = t.event_id
             where t.captain_id = me.id and t.status <> 'withdrawn' and e.status <> 'done') then
    raise exception 'captain_of_active_team';
  end if;
  if exists (select 1 from public.team_members m
             join public.teams t on t.id = m.team_id
             join public.events e on e.id = m.event_id
             where m.player_id = me.id and m.status = 'approved'
               and t.status <> 'withdrawn' and e.status = 'closed') then
    raise exception 'on_team_after_deadline';
  end if;

  -- Before the deadline a player may leave a team, so leave it now.
  update public.team_members m set status = 'left', decided_at = now()
  from public.events e
  where e.id = m.event_id and m.player_id = me.id
    and m.status in ('requested', 'approved') and e.status in ('draft', 'open');

  update public.profiles set deletion_requested_at = now() where id = me.id;
  if me.email is not null then
    insert into public.email_queue (to_email, template, lang, data)
    values (me.email, 'deletion_requested', me.language,
            jsonb_build_object('name', coalesce(me.display_name, me.legal_name),
                               'delete_on', to_char((now() + interval '14 days') at time zone 'Asia/Dhaka', 'FMDD Month YYYY')));
  end if;
  return now() + interval '14 days';
end;
$$;
revoke all on function public.request_account_deletion(text) from public, anon;
grant execute on function public.request_account_deletion(text) to authenticated;

-- Logging in again within 14 days keeps the account.
create or replace function public.cancel_account_deletion()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null or me.deletion_requested_at is null then return false; end if;
  update public.profiles set deletion_requested_at = null where id = me.id;
  if me.email is not null then
    insert into public.email_queue (to_email, template, lang, data)
    values (me.email, 'deletion_cancelled', me.language,
            jsonb_build_object('name', coalesce(me.display_name, me.legal_name)));
  end if;
  return true;
end;
$$;
revoke all on function public.cancel_account_deletion() from public, anon;
grant execute on function public.cancel_account_deletion() to authenticated;

-- For the scheduled job only (secret key).
create or replace function public.due_account_deletions()
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.profiles
  where deletion_requested_at is not null and deletion_requested_at <= now() - interval '14 days'
  order by deletion_requested_at limit 50;
$$;
revoke all on function public.due_account_deletions() from public, anon, authenticated;
grant execute on function public.due_account_deletions() to service_role;

create or replace function public.finish_account_deletion(p_user uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare me public.profiles;
begin
  select * into me from public.profiles where id = p_user for update;
  if me.id is null or me.deletion_requested_at is null
     or me.deletion_requested_at > now() - interval '14 days' then
    return false;
  end if;
  if me.player_code is not null then
    insert into public.retired_player_codes (code, profile_id) values (me.player_code, null)
    on conflict (code) do update set profile_id = null;
  end if;
  -- Only one goodbye email, even if deleting the login has to be tried again.
  if me.email is not null and not exists (
       select 1 from public.email_queue q where q.to_email = me.email and q.template = 'account_deleted'
         and q.created_at >= me.deletion_requested_at) then
    insert into public.email_queue (to_email, template, lang, data)
    values (me.email, 'account_deleted', me.language,
            jsonb_build_object('name', coalesce(me.display_name, me.legal_name)));
  end if;
  return true;
end;
$$;
revoke all on function public.finish_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.finish_account_deletion(uuid) to service_role;
