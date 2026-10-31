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
