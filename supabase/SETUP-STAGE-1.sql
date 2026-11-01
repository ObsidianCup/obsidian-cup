-- ============================================================
-- Obsidian Cup: player accounts setup (paste ALL of this into Supabase SQL Editor and press Run)
-- Safe to run again. Generated from supabase/migrations/*.sql + supabase/seed/legal_documents.sql
-- ============================================================
-- =====================================================================
-- Obsidian Cup — Stage 1: accounts foundation
-- Run once in Supabase → SQL Editor. Safe to re-run (idempotent).
--
-- Security model (see docs/PLAYER-ACCOUNTS-PLAN.md):
--   * Every table has Row Level Security on. Nothing is readable or
--     writable unless a policy below allows it.
--   * Players can read and edit only their own profile, and only the
--     columns listed in the column grants.
--   * Admins are listed by email in public.admins and must have a
--     confirmed email. Admin powers go through checked functions.
--   * Consent records are append-only: no one can edit or delete them
--     from the website.
-- =====================================================================

-- ---------- Admins ---------------------------------------------------
create table if not exists public.admins (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

insert into public.admins (email) values ('obsidiancup.official@gmail.com')
on conflict do nothing;

create or replace function public.is_admin()
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
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- Helpers --------------------------------------------------
create or replace function public.age_on(dob date, on_date date default current_date)
returns int
language sql stable set search_path = ''
as $$ select case when dob is null then null
                  else extract(year from age(on_date, dob))::int end $$;

-- Player code: OC- + initials (up to 3 letters A–Z) + 3 digits from 2–9.
create or replace function public.make_player_code(full_name text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  initials text := '';
  word text;
  candidate text;
  tries int := 0;
  digits int := 3;
begin
  foreach word in array regexp_split_to_array(upper(coalesce(full_name, '')), '\s+') loop
    word := regexp_replace(word, '[^A-Z]', '', 'g');
    if word <> '' and length(initials) < 3 then
      initials := initials || left(word, 1);
    end if;
  end loop;
  if initials = '' then initials := 'X'; end if;
  loop
    candidate := 'OC-' || initials;
    for i in 1..digits loop
      candidate := candidate || (2 + floor(random() * 8))::int::text;
    end loop;
    exit when not exists (select 1 from public.profiles p where p.player_code = candidate);
    tries := tries + 1;
    if tries > 40 then digits := digits + 1; tries := 0; end if;
  end loop;
  return candidate;
end;
$$;
revoke all on function public.make_player_code(text) from public, anon, authenticated;

-- ---------- Profiles -------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  player_code text unique,
  legal_name text check (char_length(legal_name) <= 120),
  display_name text check (char_length(display_name) <= 60),
  date_of_birth date check (date_of_birth between date '1940-01-01' and current_date),
  gender text check (gender in ('male', 'female', 'other')),
  phone text check (phone ~ '^\+?[0-9 ()-]{7,20}$'),
  school_club text check (char_length(school_club) <= 120),
  instagram text check (instagram ~ '^@?[A-Za-z0-9._]{1,30}$'),
  -- {"volleyball": ["setter", "libero"], "football": ["forward"]}
  positions jsonb not null default '{}'::jsonb check (jsonb_typeof(positions) = 'object'),
  emergency_name text check (char_length(emergency_name) <= 120),
  emergency_relationship text check (char_length(emergency_relationship) <= 60),
  emergency_phone text check (emergency_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  language text not null default 'en' check (language in ('en', 'bn')),
  media_feature boolean not null default false,
  guardian_consent_at timestamptz,          -- set by the guardian flow (stage 2)
  verified_at timestamptz,                  -- set by an admin after checking ID
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- What players may change themselves. Everything else is admin-only.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (legal_name, display_name, date_of_birth, gender, phone, school_club,
              instagram, positions, emergency_name, emergency_relationship,
              emergency_phone, language, media_feature)
  on public.profiles to authenticated;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Rules checked on every insert/update, whoever makes it.
create or replace function public.profiles_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  admin boolean := public.is_admin();
  young boolean;
begin
  new.updated_at := now();

  if tg_op = 'UPDATE' and not admin then
    -- Name and date of birth are locked once an organiser has verified the player.
    if old.verified_at is not null and
       (new.legal_name is distinct from old.legal_name or
        new.date_of_birth is distinct from old.date_of_birth) then
      raise exception 'locked_after_verification'
        using hint = 'Your name and date of birth are locked after verification. Email obsidiancup.official@gmail.com to change them.';
    end if;
  end if;

  -- Under 13: only basic details until a guardian has consented.
  young := public.age_on(new.date_of_birth) < 13;
  if young and new.guardian_consent_at is null and (
       new.phone is not null or new.school_club is not null or new.instagram is not null or
       new.emergency_name is not null or new.emergency_relationship is not null or
       new.emergency_phone is not null or new.positions <> '{}'::jsonb or new.media_feature
     ) then
    raise exception 'guardian_required_under_13'
      using hint = 'Players under 13 need a parent or guardian''s consent before adding more details.';
  end if;

  -- Player code is created once, from the legal name, and never changes.
  if new.player_code is null and coalesce(trim(new.legal_name), '') <> '' then
    new.player_code := public.make_player_code(new.legal_name);
  end if;
  if tg_op = 'UPDATE' and old.player_code is not null then
    new.player_code := old.player_code;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------- Email queue ----------------------------------------------
-- Rows are sent by the scheduled GitHub job (stage 1 adds rows only).
create table if not exists public.email_queue (
  id bigint generated always as identity primary key,
  to_email text not null,
  template text not null,
  lang text not null default 'en',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts int not null default 0,
  last_error text
);
alter table public.email_queue enable row level security;
revoke all on public.email_queue from anon, authenticated;
grant select on public.email_queue to authenticated;
drop policy if exists "email_queue: admin read" on public.email_queue;
create policy "email_queue: admin read" on public.email_queue
  for select to authenticated using ((select public.is_admin()));

-- Welcome email once the player code exists.
create or replace function public.profiles_welcome_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.player_code is not null and (tg_op = 'INSERT' or old.player_code is null)
     and new.email is not null then
    insert into public.email_queue (to_email, template, lang, data)
    values (new.email, 'welcome', new.language,
            jsonb_build_object('name', coalesce(new.display_name, new.legal_name),
                               'player_code', new.player_code));
  end if;
  return null;
end;
$$;
drop trigger if exists profiles_welcome_email on public.profiles;
create trigger profiles_welcome_email after insert or update on public.profiles
  for each row execute function public.profiles_welcome_email();

-- ---------- New sign-ups get an empty profile -------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, lower(new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in step if a player changes their login email.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;
drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------- Legal documents and consent records -----------------------
create table if not exists public.legal_documents (
  key text not null,
  version text not null,
  lang text not null check (lang in ('en', 'bn')),
  title text not null,
  sha256 text not null,
  url text,
  published_at timestamptz not null default now(),
  primary key (key, version, lang)
);
alter table public.legal_documents enable row level security;
revoke all on public.legal_documents from anon, authenticated;
grant select on public.legal_documents to anon, authenticated;
drop policy if exists "legal_documents: public read" on public.legal_documents;
create policy "legal_documents: public read" on public.legal_documents
  for select to anon, authenticated using (true);

create table if not exists public.consent_records (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete set null,
  email text,
  doc_key text not null,
  doc_version text not null,
  doc_lang text not null,
  doc_sha256 text,
  choice text not null default 'accepted' check (choice in ('accepted', 'declined', 'withdrawn')),
  context text not null default 'signup' check (char_length(context) <= 40),
  user_agent text check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now(),
  foreign key (doc_key, doc_version, doc_lang) references public.legal_documents (key, version, lang)
);
alter table public.consent_records enable row level security;
revoke all on public.consent_records from anon, authenticated;
grant select on public.consent_records to authenticated;
grant insert (doc_key, doc_version, doc_lang, choice, context, user_agent)
  on public.consent_records to authenticated;

drop policy if exists "consent_records: read own or admin" on public.consent_records;
create policy "consent_records: read own or admin" on public.consent_records
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "consent_records: add own" on public.consent_records;
create policy "consent_records: add own" on public.consent_records
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Fill in who, their email and the document fingerprint on the server,
-- so the record cannot be forged from the browser.
create or replace function public.consent_records_stamp()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  new.created_at := now();
  select lower(u.email) into new.email from auth.users u where u.id = auth.uid();
  select d.sha256 into new.doc_sha256 from public.legal_documents d
   where d.key = new.doc_key and d.version = new.doc_version and d.lang = new.doc_lang;
  return new;
end;
$$;
drop trigger if exists consent_records_stamp on public.consent_records;
create trigger consent_records_stamp before insert on public.consent_records
  for each row execute function public.consent_records_stamp();

-- Latest choice per document for the signed-in player.
create or replace view public.my_consents
with (security_invoker = true) as
  select distinct on (doc_key) doc_key, doc_version, doc_lang, choice, created_at
  from public.consent_records
  where user_id = auth.uid()
  order by doc_key, created_at desc;
grant select on public.my_consents to authenticated;

-- ---------- Admin actions ---------------------------------------------
create or replace function public.admin_set_verified(p_player uuid, p_verified boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  update public.profiles
     set verified_at = case when p_verified then now() end,
         verified_by = case when p_verified then auth.uid() end
   where id = p_player;
end;
$$;
revoke all on function public.admin_set_verified(uuid, boolean) from public, anon;
grant execute on function public.admin_set_verified(uuid, boolean) to authenticated;

-- Nothing else is exposed to the website.
revoke all on function public.age_on(date, date) from anon;

-- =====================================================================
-- Obsidian Cup — 002: reserved player codes and organiser code changes
-- Safe to re-run. Run after 001_foundation.sql.
--
-- * public.reserved_player_codes: give a chosen code (e.g. OC-UF023) to an
--   email. When that account first saves its name it gets the reserved code.
--   Add rows from the SQL Editor; personal emails never go in this repo.
-- * Organisers (admins, or the SQL Editor) can change an existing code;
--   players still cannot.
-- =====================================================================

create table if not exists public.reserved_player_codes (
  email text primary key check (email = lower(email)),
  code text not null unique check (code ~ '^OC-[A-Z]{1,3}[0-9]{3,6}$'),
  created_at timestamptz not null default now()
);
alter table public.reserved_player_codes enable row level security;
revoke all on public.reserved_player_codes from anon, authenticated;

alter table public.profiles drop constraint if exists profiles_player_code_format;
alter table public.profiles add constraint profiles_player_code_format
  check (player_code ~ '^OC-[A-Z]{1,3}[0-9]{3,6}$');

-- Generated codes never take a code that is reserved for someone else.
create or replace function public.make_player_code(full_name text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  initials text := '';
  word text;
  candidate text;
  tries int := 0;
  digits int := 3;
begin
  foreach word in array regexp_split_to_array(upper(coalesce(full_name, '')), '\s+') loop
    word := regexp_replace(word, '[^A-Z]', '', 'g');
    if word <> '' and length(initials) < 3 then
      initials := initials || left(word, 1);
    end if;
  end loop;
  if initials = '' then initials := 'X'; end if;
  loop
    candidate := 'OC-' || initials;
    for i in 1..digits loop
      candidate := candidate || (2 + floor(random() * 8))::int::text;
    end loop;
    exit when not exists (select 1 from public.profiles p where p.player_code = candidate)
          and not exists (select 1 from public.reserved_player_codes r where r.code = candidate);
    tries := tries + 1;
    if tries > 40 then digits := digits + 1; tries := 0; end if;
  end loop;
  return candidate;
end;
$$;
revoke all on function public.make_player_code(text) from public, anon, authenticated;

create or replace function public.profiles_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  admin boolean := public.is_admin();
  organiser boolean := admin or auth.uid() is null;   -- admin, or the SQL Editor / server
  young boolean;
begin
  new.updated_at := now();

  if tg_op = 'UPDATE' and not organiser then
    -- Name and date of birth are locked once an organiser has verified the player.
    if old.verified_at is not null and
       (new.legal_name is distinct from old.legal_name or
        new.date_of_birth is distinct from old.date_of_birth) then
      raise exception 'locked_after_verification'
        using hint = 'Your name and date of birth are locked after verification. Email obsidiancup.official@gmail.com to change them.';
    end if;
  end if;

  -- Under 13: only basic details until a guardian has consented.
  young := public.age_on(new.date_of_birth) < 13;
  if young and new.guardian_consent_at is null and (
       new.phone is not null or new.school_club is not null or new.instagram is not null or
       new.emergency_name is not null or new.emergency_relationship is not null or
       new.emergency_phone is not null or new.positions <> '{}'::jsonb or new.media_feature
     ) then
    raise exception 'guardian_required_under_13'
      using hint = 'Players under 13 need a parent or guardian''s consent before adding more details.';
  end if;

  -- Player code: a reserved one if this email has one, otherwise generated from the name.
  if new.player_code is null and coalesce(trim(new.legal_name), '') <> '' then
    select r.code into new.player_code
      from public.reserved_player_codes r
     where r.email = new.email
       and not exists (select 1 from public.profiles p where p.player_code = r.code and p.id <> new.id);
    if new.player_code is null then
      new.player_code := public.make_player_code(new.legal_name);
    end if;
  end if;
  -- Only organisers may change a code once it exists.
  if tg_op = 'UPDATE' and old.player_code is not null and not organiser then
    new.player_code := old.player_code;
  end if;
  return new;
end;
$$;

-- If an organiser changes a code before the welcome email has gone out,
-- the queued email shows the new code.
create or replace function public.profiles_welcome_email()
returns trigger
language plpgsql security definer set search_path = ''
as $$
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
  end if;
  return null;
end;
$$;

-- =====================================================================
-- Obsidian Cup — 003: date of birth can be changed at most 2 times
-- Safe to re-run. Run after 002_reserved_codes.sql.
--
-- Entering a date of birth for the first time does not count. After that a
-- player may change it twice; then only an organiser can change it.
-- =====================================================================

alter table public.profiles add column if not exists dob_changes int not null default 0;
-- dob_changes is not in the column grants, so players cannot edit it.

create or replace function public.profiles_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  admin boolean := public.is_admin();
  organiser boolean := admin or auth.uid() is null;   -- admin, or the SQL Editor / server
  young boolean;
begin
  new.updated_at := now();

  if tg_op = 'UPDATE' and not organiser then
    -- Name and date of birth are locked once an organiser has verified the player.
    if old.verified_at is not null and
       (new.legal_name is distinct from old.legal_name or
        new.date_of_birth is distinct from old.date_of_birth) then
      raise exception 'locked_after_verification'
        using hint = 'Your name and date of birth are locked after verification. Email obsidiancup.official@gmail.com to change them.';
    end if;
    -- Date of birth: first entry is free, then at most 2 changes.
    new.dob_changes := old.dob_changes;
    if old.date_of_birth is not null and new.date_of_birth is distinct from old.date_of_birth then
      if old.dob_changes >= 2 then
        raise exception 'dob_change_limit'
          using hint = 'You have already changed your date of birth twice. Email obsidiancup.official@gmail.com to change it.';
      end if;
      new.dob_changes := old.dob_changes + 1;
    end if;
  end if;

  -- Under 13: only basic details until a guardian has consented.
  young := public.age_on(new.date_of_birth) < 13;
  if young and new.guardian_consent_at is null and (
       new.phone is not null or new.school_club is not null or new.instagram is not null or
       new.emergency_name is not null or new.emergency_relationship is not null or
       new.emergency_phone is not null or new.positions <> '{}'::jsonb or new.media_feature
     ) then
    raise exception 'guardian_required_under_13'
      using hint = 'Players under 13 need a parent or guardian''s consent before adding more details.';
  end if;

  -- Player code: a reserved one if this email has one, otherwise generated from the name.
  if new.player_code is null and coalesce(trim(new.legal_name), '') <> '' then
    select r.code into new.player_code
      from public.reserved_player_codes r
     where r.email = new.email
       and not exists (select 1 from public.profiles p where p.player_code = r.code and p.id <> new.id);
    if new.player_code is null then
      new.player_code := public.make_player_code(new.legal_name);
    end if;
  end if;
  -- Only organisers may change a code once it exists.
  if tg_op = 'UPDATE' and old.player_code is not null and not organiser then
    new.player_code := old.player_code;
  end if;
  return new;
end;
$$;

-- =====================================================================
-- Obsidian Cup — 004: player codes stay unique under heavy load
-- Safe to re-run. Run after 003_dob_change_limit.sql.
--
-- Found by supabase/tests/load_test.mjs: when many players with the same
-- initials saved their names at the same moment, two could be offered the
-- same code and one save failed. Codes for the same initials are now handed
-- out one at a time (a short lock that ends when the save finishes).
-- =====================================================================

create or replace function public.make_player_code(full_name text)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  initials text := '';
  word text;
  candidate text;
  tries int := 0;
  digits int := 3;
begin
  foreach word in array regexp_split_to_array(upper(coalesce(full_name, '')), '\s+') loop
    word := regexp_replace(word, '[^A-Z]', '', 'g');
    if word <> '' and length(initials) < 3 then
      initials := initials || left(word, 1);
    end if;
  end loop;
  if initials = '' then initials := 'X'; end if;

  -- One code at a time per set of initials, until this save commits.
  perform pg_advisory_xact_lock(hashtext('oc_player_code:' || initials));

  loop
    candidate := 'OC-' || initials;
    for i in 1..digits loop
      candidate := candidate || (2 + floor(random() * 8))::int::text;
    end loop;
    exit when not exists (select 1 from public.profiles p where p.player_code = candidate)
          and not exists (select 1 from public.reserved_player_codes r where r.code = candidate);
    tries := tries + 1;
    if tries > 40 then digits := digits + 1; tries := 0; end if;
  end loop;
  return candidate;
end;
$$;
revoke all on function public.make_player_code(text) from public, anon, authenticated;

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

-- =====================================================================
-- Obsidian Cup — 007: sports profile
-- Safe to re-run. Run after 006_admin_two_step.sql.
--
-- Optional details for a proper player profile and later sports tracking:
-- height, weight, reach, jump, playing hand and foot, level, years playing,
-- preferred jersey number, shirt size and a short bio. All optional.
-- Weight is never shown publicly. Height and the other stats appear on a
-- public player page only if the player turns show_sport_stats on.
-- Under 13: these stay empty until a guardian has consented (like contact
-- details), to collect as little as possible about young children.
-- =====================================================================

alter table public.profiles add column if not exists height_cm smallint check (height_cm between 100 and 250);
alter table public.profiles add column if not exists weight_kg smallint check (weight_kg between 25 and 200);
alter table public.profiles add column if not exists standing_reach_cm smallint check (standing_reach_cm between 120 and 350);
alter table public.profiles add column if not exists vertical_jump_cm smallint check (vertical_jump_cm between 5 and 150);
alter table public.profiles add column if not exists dominant_hand text check (dominant_hand in ('right', 'left', 'both'));
alter table public.profiles add column if not exists dominant_foot text check (dominant_foot in ('right', 'left', 'both'));
alter table public.profiles add column if not exists playing_level text check (playing_level in ('new', 'school', 'club', 'league', 'national'));
alter table public.profiles add column if not exists playing_since smallint check (playing_since between 1980 and 2100);
alter table public.profiles add column if not exists preferred_jersey smallint check (preferred_jersey between 0 and 99);
alter table public.profiles add column if not exists shirt_size text check (shirt_size in ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'));
alter table public.profiles add column if not exists bio text check (char_length(bio) <= 280);
alter table public.profiles add column if not exists show_sport_stats boolean not null default false;

grant update (height_cm, weight_kg, standing_reach_cm, vertical_jump_cm, dominant_hand,
              dominant_foot, playing_level, playing_since, preferred_jersey, shirt_size,
              bio, show_sport_stats)
  on public.profiles to authenticated;

-- Same guard as 006/005, plus: under-13s keep the sports profile empty until
-- a guardian consents, and "playing since" cannot be in the future.
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

  if new.playing_since > extract(year from current_date) then
    raise exception 'playing_since_future' using hint = 'The year you started cannot be in the future.';
  end if;

  young := public.age_on(new.date_of_birth) < 13;
  if young and new.guardian_consent_at is null and (
       new.phone is not null or new.school_club is not null or new.instagram is not null or
       new.emergency_name is not null or new.emergency_relationship is not null or
       new.emergency_phone is not null or new.positions <> '{}'::jsonb or new.media_feature or
       new.height_cm is not null or new.weight_kg is not null or new.standing_reach_cm is not null or
       new.vertical_jump_cm is not null or new.dominant_hand is not null or new.dominant_foot is not null or
       new.playing_level is not null or new.playing_since is not null or new.preferred_jersey is not null or
       new.shirt_size is not null or new.bio is not null or new.show_sport_stats
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
  if tg_op = 'UPDATE' and old.player_code is not null and not organiser and not chosen then
    new.player_code := old.player_code;
  end if;
  return new;
end;
$$;

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

-- =====================================================================
-- Obsidian Cup — 009: events, categories, captain codes and teams
-- Safe to re-run. Run after 008_email_sender.sql.
--
-- How teams work (docs/PLAYER-ACCOUNTS-PLAN.md):
--   * Organisers create an event and its categories (age, gender, squad size).
--   * Organisers issue a captain code for a category. A player redeems it to
--     create a team and becomes its captain. One code = one team.
--   * The team gets a join code. Players ask to join with it; the captain
--     approves. A player can be in only one team per event.
--   * Captains see only name, player code, positions, jersey number and
--     whether each player is ready. Never phone, date of birth, ID or
--     emergency contact (they get "eligible: yes/no" instead).
--   * Rules checked by the database: registration open, squad size, special
--     role limit (e.g. 2 liberos), unique jersey numbers, age and gender
--     limits, unique team names within a category.
-- Under-18 guardian consent is required before a team is submitted for
-- registration (stage 3), not to join, so teams can form while it is pending.
-- =====================================================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (char_length(name) <= 120),
  sport text not null check (sport in ('volleyball', 'football')),
  starts_on date,
  ends_on date,
  venue text check (char_length(venue) <= 160),
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'open', 'closed', 'done')),
  fee_bdt int check (fee_bdt between 0 and 1000000),
  created_at timestamptz not null default now()
);

create table if not exists public.event_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) <= 60),
  gender text not null default 'any' check (gender in ('male', 'female', 'any')),
  min_age int check (min_age between 5 and 99),
  max_age int check (max_age between 5 and 99),
  age_on date,                                   -- age counted on this date
  min_players int not null default 6 check (min_players between 1 and 40),
  max_players int not null default 12 check (max_players between 1 and 40),
  special_role text,                             -- e.g. 'libero'
  max_special int,                               -- e.g. 2
  team_slots int check (team_slots between 1 and 200),
  unique (event_id, name)
);

create table if not exists public.captain_codes (
  code text primary key check (code ~ '^CAP-[A-Z2-9]{8}$'),
  category_id uuid not null references public.event_categories(id) on delete cascade,
  note text check (char_length(note) <= 120),    -- e.g. who asked for it
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid references public.profiles(id) on delete set null,
  used_at timestamptz
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.event_categories(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 40),
  captain_id uuid not null references public.profiles(id) on delete restrict,
  join_code text not null unique check (join_code ~ '^T-[A-Z2-9]{6}$'),
  status text not null default 'forming' check (status in ('forming', 'submitted', 'confirmed', 'withdrawn')),
  created_at timestamptz not null default now()
);
create unique index if not exists teams_name_per_category on public.teams (category_id, lower(trim(name)));

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'approved', 'declined', 'left', 'removed')),
  jersey_number smallint check (jersey_number between 0 and 99),
  special boolean not null default false,        -- plays the special role (libero)
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  primary key (team_id, player_id)
);
-- One team per event per player (while asking or in).
create unique index if not exists one_team_per_event on public.team_members (event_id, player_id)
  where status in ('requested', 'approved');
create unique index if not exists jersey_unique_in_team on public.team_members (team_id, jersey_number)
  where status = 'approved' and jersey_number is not null;

alter table public.events enable row level security;
alter table public.event_categories enable row level security;
alter table public.captain_codes enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

revoke all on public.events, public.event_categories, public.captain_codes, public.teams, public.team_members from anon, authenticated;
grant select on public.events, public.event_categories to anon, authenticated;
grant select on public.teams, public.team_members to authenticated;
grant select, insert, update, delete on public.events, public.event_categories, public.captain_codes to authenticated;  -- admin only, by policy

drop policy if exists "events: public read" on public.events;
create policy "events: public read" on public.events for select to anon, authenticated
  using (status <> 'draft' or (select public.is_admin()));
drop policy if exists "events: admin write" on public.events;
create policy "events: admin write" on public.events for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "categories: public read" on public.event_categories;
create policy "categories: public read" on public.event_categories for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id and (e.status <> 'draft' or (select public.is_admin()))));
drop policy if exists "categories: admin write" on public.event_categories;
create policy "categories: admin write" on public.event_categories for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "captain codes: admin only" on public.captain_codes;
create policy "captain codes: admin only" on public.captain_codes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Helpers that read team membership without tripping over RLS.
create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members m where m.team_id = p_team and m.player_id = auth.uid()
                  and m.status in ('requested', 'approved'))
      or exists (select 1 from public.teams t where t.id = p_team and t.captain_id = auth.uid());
$$;
revoke all on function public.is_team_member(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;

drop policy if exists "teams: members, captain, admin" on public.teams;
create policy "teams: members, captain, admin" on public.teams for select to authenticated
  using (captain_id = (select auth.uid()) or (select public.is_team_member(id)) or (select public.is_admin()));
drop policy if exists "team members: own rows, captain, admin" on public.team_members;
create policy "team members: own rows, captain, admin" on public.team_members for select to authenticated
  using (player_id = (select auth.uid())
      or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = (select auth.uid()))
      or (select public.is_admin()));
-- No direct writes to teams or members: everything goes through the functions below.

-- ---------- Codes ----------
create or replace function public.random_code(p_len int)
returns text language sql volatile set search_path = '' as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
    from generate_series(1, p_len);
$$;

-- Organiser: issue captain codes for a category.
create or replace function public.admin_issue_captain_codes(p_category uuid, p_count int default 1, p_note text default null)
returns setof text language plpgsql volatile security definer set search_path = '' as $$
declare c text;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  for i in 1..least(greatest(p_count, 1), 50) loop
    loop
      c := 'CAP-' || public.random_code(8);
      exit when not exists (select 1 from public.captain_codes where code = c);
    end loop;
    insert into public.captain_codes (code, category_id, note, created_by) values (c, p_category, p_note, auth.uid());
    return next c;
  end loop;
end;
$$;
revoke all on function public.admin_issue_captain_codes(uuid, int, text) from public, anon;
grant execute on function public.admin_issue_captain_codes(uuid, int, text) to authenticated;

-- ---------- Eligibility (one place, used everywhere) ----------
-- Returns null when eligible, otherwise a reason code.
create or replace function public.eligibility(p_player uuid, p_category uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  pr public.profiles; cat public.event_categories; ev public.events; age int;
begin
  select * into pr from public.profiles where id = p_player;
  select * into cat from public.event_categories where id = p_category;
  select * into ev from public.events where id = cat.event_id;
  if pr.id is null or cat.id is null then return 'not_found'; end if;
  if coalesce(trim(pr.legal_name), '') = '' or pr.date_of_birth is null or pr.gender is null then return 'profile_incomplete'; end if;
  if cat.gender <> 'any' and pr.gender <> cat.gender then return 'gender'; end if;
  age := public.age_on(pr.date_of_birth, coalesce(cat.age_on, ev.starts_on, current_date));
  if cat.min_age is not null and age < cat.min_age then return 'too_young'; end if;
  if cat.max_age is not null and age > cat.max_age then return 'too_old'; end if;
  if age < 13 and pr.guardian_consent_at is null then return 'guardian_required'; end if;
  return null;
end;
$$;
revoke all on function public.eligibility(uuid, uuid) from public, anon, authenticated;

create or replace function public.registration_open(p_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.events e where e.id = p_event and e.status = 'open'
                  and (e.registration_opens_at is null or e.registration_opens_at <= now())
                  and (e.registration_closes_at is null or e.registration_closes_at > now()));
$$;

-- ---------- Captain: create a team with a captain code ----------
create or replace function public.create_team(p_captain_code text, p_team_name text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  cc public.captain_codes; cat public.event_categories; t uuid; why text; jc text;
  v_code text := upper(regexp_replace(coalesce(p_captain_code, ''), '\s', '', 'g'));
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into cc from public.captain_codes c where c.code = v_code for update;
  if cc.code is null or cc.used_at is not null or cc.expires_at < now() then raise exception 'captain_code_invalid'; end if;
  select * into cat from public.event_categories where id = cc.category_id;
  if not public.registration_open(cat.event_id) then raise exception 'registration_closed'; end if;
  if cat.team_slots is not null and (select count(*) from public.teams where category_id = cat.id and status <> 'withdrawn') >= cat.team_slots then
    raise exception 'category_full';
  end if;
  why := public.eligibility(auth.uid(), cat.id);
  if why is not null then raise exception 'not_eligible_%', why; end if;
  if exists (select 1 from public.team_members where event_id = cat.event_id and player_id = auth.uid() and status in ('requested', 'approved')) then
    raise exception 'already_in_team';
  end if;
  loop
    jc := 'T-' || public.random_code(6);
    exit when not exists (select 1 from public.teams where join_code = jc);
  end loop;
  insert into public.teams (category_id, event_id, name, captain_id, join_code)
  values (cat.id, cat.event_id, trim(p_team_name), auth.uid(), jc) returning id into t;
  insert into public.team_members (team_id, player_id, event_id, status, decided_at)
  values (t, auth.uid(), cat.event_id, 'approved', now());
  update public.captain_codes c set used_by = auth.uid(), used_at = now() where c.code = cc.code;
  return t;
exception when unique_violation then
  raise exception 'team_name_taken';
end;
$$;

-- ---------- Player: ask to join with a join code ----------
create or replace function public.request_join(p_join_code text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare tm public.teams; why text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into tm from public.teams where join_code = upper(trim(coalesce(p_join_code, '')));
  if tm.id is null or tm.status = 'withdrawn' then raise exception 'join_code_invalid'; end if;
  if not public.registration_open(tm.event_id) then raise exception 'registration_closed'; end if;
  why := public.eligibility(auth.uid(), tm.category_id);
  if why is not null then raise exception 'not_eligible_%', why; end if;
  insert into public.team_members (team_id, player_id, event_id) values (tm.id, auth.uid(), tm.event_id)
  on conflict (team_id, player_id) do update set status = 'requested', requested_at = now(), decided_at = null
    where team_members.status in ('declined', 'left');
  return tm.id;
exception when unique_violation then
  raise exception 'already_in_team';
end;
$$;

-- ---------- Captain: approve, decline, remove; set jersey and special role ----------
create or replace function public.captain_decide(p_team uuid, p_player uuid, p_approve boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare tm public.teams; cat public.event_categories; n int;
begin
  select * into tm from public.teams where id = p_team for update;
  if tm.captain_id is distinct from auth.uid() and not public.is_admin() then raise exception 'not_captain'; end if;
  if tm.status <> 'forming' and not public.is_admin() then raise exception 'team_locked'; end if;
  select * into cat from public.event_categories where id = tm.category_id;
  if p_approve then
    select count(*) into n from public.team_members where team_id = p_team and status = 'approved';
    if n >= cat.max_players then raise exception 'squad_full'; end if;
    if public.eligibility(p_player, cat.id) is not null then raise exception 'not_eligible_%', public.eligibility(p_player, cat.id); end if;
  end if;
  update public.team_members set status = case when p_approve then 'approved' else 'declined' end, decided_at = now()
   where team_id = p_team and player_id = p_player and status = 'requested';
  if not found then raise exception 'no_request'; end if;
end;
$$;

create or replace function public.captain_remove(p_team uuid, p_player uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare tm public.teams;
begin
  select * into tm from public.teams where id = p_team;
  if tm.captain_id is distinct from auth.uid() and not public.is_admin() then raise exception 'not_captain'; end if;
  if p_player = tm.captain_id then raise exception 'cannot_remove_captain'; end if;
  if tm.status <> 'forming' and not public.is_admin() then raise exception 'team_locked'; end if;
  update public.team_members set status = 'removed', decided_at = now(), jersey_number = null, special = false
   where team_id = p_team and player_id = p_player and status in ('requested', 'approved');
end;
$$;

create or replace function public.captain_set_player(p_team uuid, p_player uuid, p_jersey smallint, p_special boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare tm public.teams; cat public.event_categories; n int;
begin
  select * into tm from public.teams where id = p_team for update;
  if tm.captain_id is distinct from auth.uid() and not public.is_admin() then raise exception 'not_captain'; end if;
  if tm.status <> 'forming' and not public.is_admin() then raise exception 'team_locked'; end if;
  select * into cat from public.event_categories where id = tm.category_id;
  if p_special then
    if cat.special_role is null then raise exception 'no_special_role'; end if;
    select count(*) into n from public.team_members
     where team_id = p_team and status = 'approved' and special and player_id <> p_player;
    if cat.max_special is not null and n >= cat.max_special then raise exception 'special_limit'; end if;
  end if;
  update public.team_members set jersey_number = p_jersey, special = coalesce(p_special, false)
   where team_id = p_team and player_id = p_player and status = 'approved';
  if not found then raise exception 'not_in_team'; end if;
exception when unique_violation then
  raise exception 'jersey_taken';
end;
$$;

-- Player leaves (captains cannot leave their own team; an organiser can reassign).
create or replace function public.leave_team(p_team uuid)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare tm public.teams;
begin
  select * into tm from public.teams where id = p_team;
  if tm.captain_id = auth.uid() then raise exception 'captain_cannot_leave'; end if;
  if tm.status <> 'forming' then raise exception 'team_locked'; end if;
  update public.team_members set status = 'left', decided_at = now(), jersey_number = null, special = false
   where team_id = p_team and player_id = auth.uid() and status in ('requested', 'approved');
end;
$$;

-- What a captain may see about the squad. No phone, date of birth, ID or
-- emergency details: only whether the player is eligible and ready.
create or replace function public.team_roster(p_team uuid)
returns table (player_id uuid, name text, player_code text, positions jsonb, status text,
               jersey_number smallint, special boolean, eligible boolean, problem text,
               guardian_needed boolean)
language sql stable security definer set search_path = '' as $$
  select m.player_id, coalesce(p.display_name, p.legal_name), p.player_code, p.positions, m.status,
         m.jersey_number, m.special,
         public.eligibility(m.player_id, t.category_id) is null,
         case when t.captain_id = auth.uid() or public.is_admin() or m.player_id = auth.uid()
              then public.eligibility(m.player_id, t.category_id) end,
         (public.age_on(p.date_of_birth, coalesce(c.age_on, e.starts_on, current_date)) < 18 and p.guardian_consent_at is null)
    from public.teams t
    join public.event_categories c on c.id = t.category_id
    join public.events e on e.id = t.event_id
    join public.team_members m on m.team_id = t.id
    join public.profiles p on p.id = m.player_id
   where t.id = p_team
     and m.status in ('requested', 'approved')
     and (t.captain_id = auth.uid() or public.is_admin()
          or (m.status = 'approved' and public.is_team_member(t.id)))
   order by m.status desc, coalesce(p.display_name, p.legal_name);
$$;

do $$
declare f text;
begin
  foreach f in array array['create_team(text, text)', 'request_join(text)', 'captain_decide(uuid, uuid, boolean)',
                           'captain_remove(uuid, uuid)', 'captain_set_player(uuid, uuid, smallint, boolean)',
                           'leave_team(uuid)', 'team_roster(uuid)', 'registration_open(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke all on function public.random_code(int) from public, anon, authenticated;

-- Generated by scripts/split_legal.py. Do not edit by hand.
insert into public.legal_documents (key, version, lang, title, sha256, url) values
  ('terms', '1.0', 'en', 'Obsidian Cup Account Terms of Use', '5e11a655bbba45b0304bc392b8023b368ec4b2a638f66757f8d75ac907a957ed', '/legal/en/terms-1.0.md'),
  ('privacy', '1.1', 'en', 'Obsidian Cup Privacy Notice', '6604ec6dd101d6ad6fe63a1ef3b57dafae7cd3a8ffcd0968086005bc81965818', '/legal/en/privacy-1.1.md'),
  ('privacy', '1.0', 'en', 'Obsidian Cup Privacy Notice', 'a3f246abbb2f0577c3cf0548d27b27e5de88792b038fcc73517a8159d9c10d34', '/legal/en/privacy-1.0.md'),
  ('media', '1.0', 'en', 'Obsidian Cup Media Consent', '8f2a9764914b9fd81872ce89314c27d85f877c55eff0b7812f502a5b6ad65fe3', '/legal/en/media-1.0.md'),
  ('participation', '1.0', 'en', 'Obsidian Cup Event Participation Agreement', '7e7ec520bc7890d1575552617ec68e02b41147432e609bc8fe0564643c5a4f9c', '/legal/en/participation-1.0.md'),
  ('payment', '1.0', 'en', 'Obsidian Cup Payment, Refund and Event Change Policy', '6ebc3b07e976cbd7547e2acf45374bba31cbcc63df3f7b88e3ae953c533de9d0', '/legal/en/payment-1.0.md'),
  ('guardian', '1.0', 'en', 'Obsidian Cup Parent / Guardian Consent', 'a83fb27d1fc7fe2a25c90d78290959247aed353b63c9c1d52c7e4669576d789f', '/legal/en/guardian-1.0.md'),
  ('captain_code', '1.0', 'en', 'Captain Code Terms', '3a8962c120a54da28088d085a228065108b87f93530e172ace3fc4ea3e0da6ab', '/legal/en/captain_code-1.0.md'),
  ('captain_declaration', '1.0', 'en', 'Captain Declaration', '97c9b1af351b8d9344901dc8fbbf402974cedc22f31bb8c20579b8540f5f20a6', '/legal/en/captain_declaration-1.0.md'),
  ('dob_declaration', '1.0', 'en', 'Date of birth declaration', '4b8a14b393f8a25643984717bfc7dddef3177ace4f43e124289363784279734b', null),
  ('dob_declaration', '1.1', 'en', 'Date of birth declaration', '942385203de3406464956b34f0aa8b403355c7a3b9c7b8951eb975f095f8698c', null),
  ('media_feature', '1.0', 'en', 'Individual feature in promotional posts (optional)', 'f534cea4c5bde1ebef420352ad31f07b6404ad060be09ceb8ff5c76f9fabf42f', null)
on conflict (key, version, lang) do update set title = excluded.title, sha256 = excluded.sha256, url = excluded.url;
