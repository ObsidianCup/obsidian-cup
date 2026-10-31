-- =====================================================================
-- Obsidian Cup — 005: players choose their own code, and can log in with it
-- Safe to re-run. Run after 004_code_concurrency.sql.
--
-- * Every player still gets a code automatically when they first save their
--   name (OC- + initials + digits). They can then pick a different one, like
--   choosing an Instagram username, from codes that start with OC- and their
--   own initials and are not taken. At most 2 changes; organisers unlimited.
-- * A code someone gave up is retired and never handed out again, so old
--   team lists and certificates never point at a different person.
-- * Login with player code + password goes through the Edge Function
--   supabase/functions/login-with-code. It looks the email up on the server,
--   so typing a code never reveals anyone's email. Failed attempts are
--   counted here (login_code_attempts) to slow down password guessing.
-- =====================================================================

-- ---------- Initials, in one place ----------
create or replace function public.player_initials(full_name text)
returns text
language plpgsql immutable set search_path = ''
as $$
declare
  initials text := '';
  word text;
begin
  foreach word in array regexp_split_to_array(upper(coalesce(full_name, '')), '\s+') loop
    word := regexp_replace(word, '[^A-Z]', '', 'g');
    if word <> '' and length(initials) < 3 then
      initials := initials || left(word, 1);
    end if;
  end loop;
  return case when initials = '' then 'X' else initials end;
end;
$$;

-- ---------- Retired codes ----------
create table if not exists public.retired_player_codes (
  code text primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  retired_at timestamptz not null default now()
);
alter table public.retired_player_codes enable row level security;
revoke all on public.retired_player_codes from anon, authenticated;

alter table public.profiles add column if not exists code_changes int not null default 0;
-- code_changes is not in the column grants, so players cannot edit it.

-- ---------- Is a code free? (used by everything below) ----------
create or replace function public.player_code_free(p_code text, p_for uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select not exists (select 1 from public.profiles p where p.player_code = p_code and p.id is distinct from p_for)
     and not exists (select 1 from public.retired_player_codes r where r.code = p_code
                       and r.profile_id is distinct from p_for)
     and not exists (select 1 from public.reserved_player_codes r join public.profiles p on p.id = p_for
                      where r.code = p_code and r.email <> p.email)
     and not exists (select 1 from public.reserved_player_codes r where r.code = p_code and p_for is null);
$$;
revoke all on function public.player_code_free(text, uuid) from public, anon, authenticated;

-- Automatic codes skip retired ones too.
create or replace function public.make_player_code(full_name text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  initials text := public.player_initials(full_name);
  candidate text;
  tries int := 0;
  digits int := 3;
begin
  perform pg_advisory_xact_lock(hashtext('oc_player_code:' || initials));
  loop
    candidate := 'OC-' || initials;
    for i in 1..digits loop
      candidate := candidate || (2 + floor(random() * 8))::int::text;
    end loop;
    exit when public.player_code_free(candidate, null);
    tries := tries + 1;
    if tries > 40 then digits := digits + 1; tries := 0; end if;
  end loop;
  return candidate;
end;
$$;
revoke all on function public.make_player_code(text) from public, anon, authenticated;

-- ---------- What can I pick? ----------
-- Returns: ok | taken | format | initials | no_name | limit
create or replace function public.player_code_status(p_code text)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  me public.profiles;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or coalesce(trim(me.legal_name), '') = '' then return 'no_name'; end if;
  if v_code !~ '^OC-[A-Z]{1,3}[0-9]{3,4}$' then return 'format'; end if;
  if substring(v_code from '^OC-([A-Z]+)') <> public.player_initials(me.legal_name) then return 'initials'; end if;
  if v_code = me.player_code then return 'ok'; end if;
  if not public.is_admin() and me.code_changes >= 2 then return 'limit'; end if;
  if not public.player_code_free(v_code, me.id) then return 'taken'; end if;
  return 'ok';
end;
$$;
revoke all on function public.player_code_status(text) from public, anon;
grant execute on function public.player_code_status(text) to authenticated;

-- A few free codes to choose from, Instagram style.
create or replace function public.suggest_player_codes()
returns setof text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me public.profiles;
  pre text;
  pool text[] := array[]::text[];
  c text;
  n int := 0;
  d int;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or coalesce(trim(me.legal_name), '') = '' then return; end if;
  pre := 'OC-' || public.player_initials(me.legal_name);
  -- Patterns people like: 777, 123, 2026, 010, then random.
  d := 1 + floor(random() * 9)::int;
  pool := pool || (pre || repeat(d::text, 3));
  d := floor(random() * 7)::int;
  pool := pool || (pre || d::text || (d + 1)::text || (d + 2)::text);
  pool := pool || (pre || to_char(now(), 'YYYY'));
  d := 1 + floor(random() * 9)::int;
  pool := pool || (pre || '0' || d::text || '0');
  for i in 1..12 loop
    pool := pool || (pre || lpad(floor(random() * 1000)::int::text, 3, '0'));
  end loop;
  foreach c in array pool loop
    if n < 6 and c <> coalesce(me.player_code, '') and public.player_code_free(c, me.id) then
      return next c;
      n := n + 1;
    end if;
  end loop;
  -- Popular initials: keep looking, moving to 4 digits if 3-digit codes run short.
  for i in 1..200 loop
    exit when n >= 6;
    c := pre || case when i < 60 then lpad(floor(random() * 1000)::int::text, 3, '0')
                     else lpad(floor(random() * 10000)::int::text, 4, '0') end;
    if c <> coalesce(me.player_code, '') and public.player_code_free(c, me.id) then
      return next c;
      n := n + 1;
    end if;
  end loop;
end;
$$;
revoke all on function public.suggest_player_codes() from public, anon;
grant execute on function public.suggest_player_codes() to authenticated;

-- Take the code. Checks again inside a lock, so two players cannot grab the same one.
create or replace function public.choose_player_code(p_code text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  me public.profiles;
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  status text;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then raise exception 'not_signed_in'; end if;
  perform pg_advisory_xact_lock(hashtext('oc_player_code:' || public.player_initials(me.legal_name)));
  status := public.player_code_status(v_code);
  if status <> 'ok' then
    raise exception 'code_%', status using hint = status;
  end if;
  if v_code = me.player_code then return v_code; end if;

  if me.player_code is not null then
    insert into public.retired_player_codes (code, profile_id) values (me.player_code, me.id)
      on conflict (code) do nothing;
  end if;
  perform set_config('oc.allow_code_change', '1', true);
  update public.profiles
     set player_code = v_code,
         code_changes = case when me.player_code is null then code_changes else code_changes + 1 end
   where id = me.id;
  perform set_config('oc.allow_code_change', '', true);
  return v_code;
end;
$$;
revoke all on function public.choose_player_code(text) from public, anon;
grant execute on function public.choose_player_code(text) to authenticated;

-- ---------- Profile guard: allow the change made by choose_player_code ----------
create or replace function public.profiles_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  admin boolean := public.is_admin();
  organiser boolean := admin or auth.uid() is null;   -- admin, or the SQL Editor / server
  chosen boolean := coalesce(current_setting('oc.allow_code_change', true), '') = '1';
  young boolean;
begin
  new.updated_at := now();

  if tg_op = 'UPDATE' and not organiser then
    if old.verified_at is not null and
       (new.legal_name is distinct from old.legal_name or
        new.date_of_birth is distinct from old.date_of_birth) then
      raise exception 'locked_after_verification'
        using hint = 'Your name and date of birth are locked after verification. Email obsidiancup.official@gmail.com to change them.';
    end if;
    new.dob_changes := old.dob_changes;
    if old.date_of_birth is not null and new.date_of_birth is distinct from old.date_of_birth then
      if old.dob_changes >= 2 then
        raise exception 'dob_change_limit'
          using hint = 'You have already changed your date of birth twice. Email obsidiancup.official@gmail.com to change it.';
      end if;
      new.dob_changes := old.dob_changes + 1;
    end if;
    if not chosen then new.code_changes := old.code_changes; end if;
  end if;

  young := public.age_on(new.date_of_birth) < 13;
  if young and new.guardian_consent_at is null and (
       new.phone is not null or new.school_club is not null or new.instagram is not null or
       new.emergency_name is not null or new.emergency_relationship is not null or
       new.emergency_phone is not null or new.positions <> '{}'::jsonb or new.media_feature
     ) then
    raise exception 'guardian_required_under_13'
      using hint = 'Players under 13 need a parent or guardian''s consent before adding more details.';
  end if;

  if new.player_code is null and coalesce(trim(new.legal_name), '') <> '' then
    select r.code into new.player_code
      from public.reserved_player_codes r
     where r.email = new.email
       and not exists (select 1 from public.profiles p where p.player_code = r.code and p.id <> new.id);
    if new.player_code is null then
      new.player_code := public.make_player_code(new.legal_name);
    end if;
  end if;
  -- Only organisers, or the player through choose_player_code, may change a code.
  if tg_op = 'UPDATE' and old.player_code is not null and not organiser and not chosen then
    new.player_code := old.player_code;
  end if;
  return new;
end;
$$;

-- ---------- Emails when a code changes ----------
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
    update public.email_queue
       set data = jsonb_set(data, '{player_code}', to_jsonb(new.player_code))
     where to_email = new.email and template = 'welcome' and sent_at is null;
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

-- ---------- Login with player code: attempt counter ----------
create table if not exists public.login_code_attempts (
  id bigint generated always as identity primary key,
  code text not null,
  ip text,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists login_code_attempts_code_at on public.login_code_attempts (code, at);
create index if not exists login_code_attempts_ip_at on public.login_code_attempts (ip, at);
alter table public.login_code_attempts enable row level security;
revoke all on public.login_code_attempts from anon, authenticated;

-- "uf023", "OC UF023", "oc-uf023" all mean OC-UF023.
create or replace function public.normalize_player_code(p_code text)
returns text
language sql immutable set search_path = ''
as $$
  select 'OC-' || regexp_replace(regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g'), '^OC', '');
$$;

-- Server only (the Edge Function). Returns the email for a code, or null when
-- the code does not exist. Refuses after too many failed tries:
-- 5 per code or 20 per internet address in 15 minutes.
create or replace function public.login_code_lookup(p_code text, p_ip text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_code text := public.normalize_player_code(p_code);
  v_email text;
begin
  if (select count(*) from public.login_code_attempts a
       where a.code = v_code and not a.ok and a.at > now() - interval '15 minutes') >= 5
  or (select count(*) from public.login_code_attempts a
       where a.ip = p_ip and not a.ok and a.at > now() - interval '15 minutes') >= 20 then
    raise exception 'too_many_attempts';
  end if;
  select p.email into v_email from public.profiles p where p.player_code = v_code;
  return v_email;
end;
$$;
revoke all on function public.login_code_lookup(text, text) from public, anon, authenticated;

create or replace function public.login_code_record(p_code text, p_ip text, p_ok boolean)
returns void
language sql volatile security definer set search_path = ''
as $$
  insert into public.login_code_attempts (code, ip, ok)
  values (left(public.normalize_player_code(p_code), 20), left(p_ip, 64), p_ok);
  delete from public.login_code_attempts where at < now() - interval '1 day';
$$;
revoke all on function public.login_code_record(text, text, boolean) from public, anon, authenticated;

-- Only the server key (used by the Edge Function) may call these two.
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.login_code_lookup(text, text) to service_role;
    grant execute on function public.login_code_record(text, text, boolean) to service_role;
  end if;
end $$;
