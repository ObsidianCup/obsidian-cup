-- 014: security hardening (13 Nov 2026).
-- Safe to run again.
--
--   1. Visitors who are not logged in ("anon") can run NO database function.
--      Postgres lets everyone run a new function unless that is taken away;
--      a few helper functions had been left open that way. Logged-in players
--      and the email job keep exactly what they had.
--   2. Throwaway email addresses (mailinator and similar) cannot make an
--      account. The list is a table: organisers can add or remove a domain
--      in Supabase → Table Editor → blocked_email_domains.

-- ---------- 1. Nothing for anon ----------
do $$
declare
  r record;
  has_service boolean := exists (select 1 from pg_roles where rolname = 'service_role');
begin
  for r in
    select p.oid::regprocedure as sig,
           has_function_privilege('authenticated', p.oid, 'execute') as for_players,
           has_service and has_function_privilege('service_role', p.oid, 'execute') as for_job
      from pg_proc p
      join pg_roles o on o.oid = p.proowner
     where p.pronamespace = 'public'::regnamespace
       and p.prokind = 'f'
       and o.rolname = current_user          -- only our own functions, never an extension's
  loop
    execute format('revoke all on function %s from public, anon', r.sig);
    if r.for_players then execute format('grant execute on function %s to authenticated', r.sig); end if;
    if r.for_job then execute format('grant execute on function %s to service_role', r.sig); end if;
  end loop;
end $$;

-- The public pages read events and categories without logging in. Their rules
-- ask "or is this an organiser?", which anon may not run; give anon its own
-- rules that never ask.
drop policy if exists "events: public read" on public.events;
drop policy if exists "events: visitor read" on public.events;
create policy "events: visitor read" on public.events for select to anon
  using (status <> 'draft');
drop policy if exists "events: player read" on public.events;
create policy "events: player read" on public.events for select to authenticated
  using (status <> 'draft' or (select public.is_admin()));

drop policy if exists "categories: public read" on public.event_categories;
drop policy if exists "categories: visitor read" on public.event_categories;
create policy "categories: visitor read" on public.event_categories for select to anon
  using (exists (select 1 from public.events e where e.id = event_id and e.status <> 'draft'));
drop policy if exists "categories: player read" on public.event_categories;
create policy "categories: player read" on public.event_categories for select to authenticated
  using (exists (select 1 from public.events e where e.id = event_id and (e.status <> 'draft' or (select public.is_admin()))));

-- ---------- 2. No throwaway email addresses ----------
create table if not exists public.blocked_email_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  added_at timestamptz not null default now()
);
alter table public.blocked_email_domains enable row level security;
revoke all on public.blocked_email_domains from anon, authenticated;
-- No policies: only organisers working in the Supabase dashboard see or change it.

insert into public.blocked_email_domains (domain) values
  ('mailinator.com'), ('guerrillamail.com'), ('guerrillamail.net'), ('guerrillamail.org'),
  ('guerrillamailblock.com'), ('sharklasers.com'), ('grr.la'), ('pokemail.net'), ('spam4.me'),
  ('10minutemail.com'), ('10minutemail.net'), ('10minemail.com'), ('temp-mail.org'), ('temp-mail.io'),
  ('tempmail.com'), ('tempmail.net'), ('tempmail.dev'), ('tempmailo.com'), ('tempail.com'),
  ('tmpmail.org'), ('tmpmail.net'), ('tmail.ws'), ('throwawaymail.com'), ('trashmail.com'),
  ('trashmail.net'), ('trashmail.de'), ('yopmail.com'), ('yopmail.fr'), ('yopmail.net'),
  ('getnada.com'), ('nada.email'), ('dispostable.com'), ('maildrop.cc'), ('mailnesia.com'),
  ('mailcatch.com'), ('mintemail.com'), ('mohmal.com'), ('moakt.com'), ('emailondeck.com'),
  ('fakeinbox.com'), ('fakemail.net'), ('fakemailgenerator.com'), ('mytemp.email'), ('mailtemp.net'),
  ('tempinbox.com'), ('tempr.email'), ('discard.email'), ('discardmail.com'), ('spamgourmet.com'),
  ('mailsac.com'), ('inboxkitten.com'), ('burnermail.io'), ('minutemail.com'), ('emailfake.com'),
  ('email-fake.com'), ('generator.email'), ('1secmail.com'), ('1secmail.net'), ('1secmail.org'),
  ('luxusmail.org'), ('linshiyou.com'), ('byom.de'), ('harakirimail.com'), ('mailpoof.com'),
  ('tempmailaddress.com'), ('crazymailing.com'), ('dropmail.me'), ('instantemailaddress.com'),
  ('guerrillamail.biz'), ('guerrillamail.de'), ('mail.tm'),
  ('incognitomail.org'), ('jetable.org'), ('nowmymail.com'), ('owlymail.com')
on conflict do nothing;

create or replace function public.email_domain_blocked(p_email text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  -- the domain itself or any parent of it (a.b.mailinator.com is blocked too)
  select exists (
    select 1 from public.blocked_email_domains b
     where lower(split_part(p_email, '@', 2)) = b.domain
        or lower(split_part(p_email, '@', 2)) like '%.' || b.domain);
$$;
revoke all on function public.email_domain_blocked(text) from public, anon, authenticated;

create or replace function public.auth_users_email_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is not null and public.email_domain_blocked(new.email) then
    raise exception 'email_domain_not_allowed' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.auth_users_email_guard() from public, anon, authenticated;

drop trigger if exists oc_email_guard_insert on auth.users;
create trigger oc_email_guard_insert before insert on auth.users
  for each row execute function public.auth_users_email_guard();
drop trigger if exists oc_email_guard_update on auth.users;
create trigger oc_email_guard_update before update of email on auth.users
  for each row when (new.email is distinct from old.email)
  execute function public.auth_users_email_guard();
