-- 016: two email fixes (17 Nov 2026). Safe to run again.
--
--   1. The email job threw away the three account-deletion emails
--      (deletion requested, deletion cancelled, account deleted) as "unknown
--      template". They are now allowed, like the welcome and code emails.
--   2. Changing a player code folded the news into an older welcome email
--      that had never gone out, even when that welcome had already expired,
--      so nothing was ever sent. Now it only does that while the welcome can
--      still be sent; otherwise a fresh "code changed" email is queued.

create or replace function public.email_claim(p_limit int default 50, p_daily_cap int default 450)
returns setof public.email_queue
language plpgsql volatile security definer set search_path = ''
as $$
declare
  sent_today int;
  room int;
  known constant text[] := array['welcome', 'code_changed', 'deletion_requested', 'deletion_cancelled', 'account_deleted'];
begin
  select count(*) into sent_today from public.email_queue
   where sent_at > now() - interval '24 hours';
  room := greatest(0, least(p_limit, p_daily_cap - sent_today));

  -- Never send: unknown template, too old, or (for every email except the
  -- one confirming a deletion, whose account is already gone) not a
  -- confirmed account.
  update public.email_queue e
     set attempts = 5, last_error = case
           when not (e.template = any (known)) then 'skipped: unknown template'
           when e.created_at < now() - interval '7 days' then 'skipped: older than 7 days'
           else 'skipped: not a confirmed player account' end
   where e.sent_at is null and e.attempts < 5
     and (not (e.template = any (known))
          or e.created_at < now() - interval '7 days'
          or (e.template <> 'account_deleted' and not exists (
                select 1 from auth.users u
                 where lower(u.email) = lower(e.to_email) and u.email_confirmed_at is not null)));

  return query
  update public.email_queue q
     set claimed_at = now(), attempts = q.attempts + 1
   where q.id in (
     select e.id from public.email_queue e
      where e.sent_at is null and e.attempts < 5
        and (e.claimed_at is null or e.claimed_at < now() - interval '10 minutes')
      order by e.created_at
      limit room
      for update skip locked)
  returning q.*;
end;
$$;
revoke all on function public.email_claim(int, int) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.email_claim(int, int) to service_role';
  end if;
end $$;

create or replace function public.profiles_welcome_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  n int;
begin
  if new.player_code is not null and (tg_op = 'INSERT' or old.player_code is null)
     and new.email is not null then
    insert into public.email_queue (to_email, template, lang, data)
    values (new.email, 'welcome', new.language,
            jsonb_build_object('name', coalesce(new.display_name, new.legal_name),
                               'player_code', new.player_code));
  elsif tg_op = 'UPDATE' and old.player_code is not null and new.player_code <> old.player_code then
    -- A welcome that can still go out simply carries the new code.
    update public.email_queue
       set data = jsonb_set(data, '{player_code}', to_jsonb(new.player_code))
     where to_email = new.email and template = 'welcome' and sent_at is null
       and attempts < 5 and created_at > now() - interval '7 days';
    get diagnostics n = row_count;
    if n = 0 then
      insert into public.email_queue (to_email, template, lang, data)
      values (new.email, 'code_changed', new.language,
              jsonb_build_object('name', coalesce(new.display_name, new.legal_name),
                                 'player_code', new.player_code, 'old_code', old.player_code));
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public.profiles_welcome_email() from public, anon, authenticated;
