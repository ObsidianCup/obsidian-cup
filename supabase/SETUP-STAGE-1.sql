-- ============================================================
-- Obsidian Cup: Stage 1 setup (paste ALL of this into Supabase SQL Editor and press Run)
-- Generated from supabase/migrations/001_foundation.sql + supabase/seed/legal_documents.sql
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

-- Generated by scripts/split_legal.py. Do not edit by hand.
insert into public.legal_documents (key, version, lang, title, sha256, url) values
  ('terms', '1.0', 'en', 'Obsidian Cup Account Terms of Use', '5e11a655bbba45b0304bc392b8023b368ec4b2a638f66757f8d75ac907a957ed', '/legal/en/terms-1.0.md'),
  ('privacy', '1.0', 'en', 'Obsidian Cup Privacy Notice', 'a3f246abbb2f0577c3cf0548d27b27e5de88792b038fcc73517a8159d9c10d34', '/legal/en/privacy-1.0.md'),
  ('media', '1.0', 'en', 'Obsidian Cup Media Consent', '8f2a9764914b9fd81872ce89314c27d85f877c55eff0b7812f502a5b6ad65fe3', '/legal/en/media-1.0.md'),
  ('participation', '1.0', 'en', 'Obsidian Cup Event Participation Agreement', '7e7ec520bc7890d1575552617ec68e02b41147432e609bc8fe0564643c5a4f9c', '/legal/en/participation-1.0.md'),
  ('payment', '1.0', 'en', 'Obsidian Cup Payment, Refund and Event Change Policy', '6ebc3b07e976cbd7547e2acf45374bba31cbcc63df3f7b88e3ae953c533de9d0', '/legal/en/payment-1.0.md'),
  ('guardian', '1.0', 'en', 'Obsidian Cup Parent / Guardian Consent', 'a83fb27d1fc7fe2a25c90d78290959247aed353b63c9c1d52c7e4669576d789f', '/legal/en/guardian-1.0.md'),
  ('captain_code', '1.0', 'en', 'Captain Code Terms', '3a8962c120a54da28088d085a228065108b87f93530e172ace3fc4ea3e0da6ab', '/legal/en/captain_code-1.0.md'),
  ('captain_declaration', '1.0', 'en', 'Captain Declaration', '97c9b1af351b8d9344901dc8fbbf402974cedc22f31bb8c20579b8540f5f20a6', '/legal/en/captain_declaration-1.0.md'),
  ('dob_declaration', '1.0', 'en', 'Date of birth declaration', '4b8a14b393f8a25643984717bfc7dddef3177ace4f43e124289363784279734b', null),
  ('media_feature', '1.0', 'en', 'Individual feature in promotional posts (optional)', 'f534cea4c5bde1ebef420352ad31f07b6404ad060be09ceb8ff5c76f9fabf42f', null)
on conflict (key, version, lang) do update set title = excluded.title, sha256 = excluded.sha256, url = excluded.url;
