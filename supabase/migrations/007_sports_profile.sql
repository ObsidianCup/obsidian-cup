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
