-- =====================================================================
-- Obsidian Cup — 008: automatic email sender
-- Safe to re-run. Run after 007_sports_profile.sql.
--
-- A GitHub Action (.github/workflows/send-emails.yml) runs every 15 minutes,
-- takes a batch of unsent emails with email_claim(), sends them through the
-- Gmail account, and reports each result with email_done(). Only the server
-- key can call these. Each email is tried at most 5 times. The same run also
-- keeps the free Supabase project awake.
-- =====================================================================

alter table public.email_queue add column if not exists claimed_at timestamptz;
create index if not exists email_queue_unsent on public.email_queue (created_at) where sent_at is null;

-- Hands out up to p_limit unsent emails, oldest first. An email stays claimed
-- for 10 minutes, so two runs never send the same one. A daily cap keeps us
-- under Gmail's limit (about 500 a day).
create or replace function public.email_claim(p_limit int default 50, p_daily_cap int default 450)
returns setof public.email_queue
language plpgsql volatile security definer set search_path = ''
as $$
declare
  sent_today int;
  room int;
begin
  select count(*) into sent_today from public.email_queue
   where sent_at > now() - interval '24 hours';
  room := greatest(0, least(p_limit, p_daily_cap - sent_today));
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

create or replace function public.email_done(p_id bigint, p_ok boolean, p_error text default null)
returns void
language sql volatile security definer set search_path = ''
as $$
  update public.email_queue
     set sent_at = case when p_ok then now() else sent_at end,
         last_error = case when p_ok then null else left(p_error, 300) end,
         claimed_at = case when p_ok then claimed_at else null end
   where id = p_id;
$$;

revoke all on function public.email_claim(int, int) from public, anon, authenticated;
revoke all on function public.email_done(bigint, boolean, text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.email_claim(int, int) to service_role;
    grant execute on function public.email_done(bigint, boolean, text) to service_role;
  end if;
end $$;
