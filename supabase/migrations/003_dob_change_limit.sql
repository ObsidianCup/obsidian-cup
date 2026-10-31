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
