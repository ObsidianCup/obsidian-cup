-- =====================================================================
-- Obsidian Cup — 011: sports choice, organiser-set level, card status
-- Safe to re-run. Run after 010_player_card.sql.
--
-- * sports: which sports the player plays ('volleyball', 'football' =
--   futsal). Chosen before the account opens; a player can add the other
--   sport later. At least one is needed once chosen (empty = not chosen yet).
-- * playing_level: only organisers can set or change it (admin_set_level).
--   Players see it on their card but cannot edit it. 'school' becomes
--   'amateur'.
-- * my_card(): the player's own current teams for their player card.
-- * admin_player_teams(): the same for an organiser looking a player up.
-- =====================================================================

alter table public.profiles add column if not exists sports text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_sports_check;
alter table public.profiles add constraint profiles_sports_check
  check (sports <@ array['volleyball', 'football']::text[]);
grant update (sports) on public.profiles to authenticated;

-- Level: 'school' -> 'amateur'
alter table public.profiles drop constraint if exists profiles_playing_level_check;
update public.profiles set playing_level = 'amateur' where playing_level = 'school';
alter table public.profiles add constraint profiles_playing_level_check
  check (playing_level in ('new', 'amateur', 'club', 'league', 'national'));

-- Players cannot change their level; organisers (and the SQL Editor) can.
-- A player who once picked sports cannot remove all of them.
create or replace function public.profiles_player_limits()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.is_admin() or auth.uid() is null) then
    new.playing_level := old.playing_level;
    if cardinality(old.sports) > 0 and cardinality(new.sports) = 0 then
      raise exception 'sports_required' using hint = 'Keep at least one sport.';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_player_limits on public.profiles;
create trigger profiles_player_limits before update on public.profiles
  for each row execute function public.profiles_player_limits();

create or replace function public.admin_set_level(p_player uuid, p_level text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.profiles set playing_level = nullif(p_level, '') where id = p_player;
end;
$$;
revoke all on function public.admin_set_level(uuid, text) from public, anon;
grant execute on function public.admin_set_level(uuid, text) to authenticated;

-- Teams in events that are not finished, for one player.
create or replace function public.player_current_teams(p uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'team', t.name, 'event', e.name, 'category', c.name, 'sport', e.sport,
           'status', m.status, 'jersey', m.jersey_number)
           order by e.starts_on desc nulls last), '[]'::jsonb)
    from public.team_members m
    join public.teams t on t.id = m.team_id
    join public.events e on e.id = m.event_id
    join public.event_categories c on c.id = t.category_id
   where m.player_id = p
     and m.status in ('requested', 'approved')
     and e.status <> 'done';
$$;
revoke all on function public.player_current_teams(uuid) from public, anon, authenticated;

create or replace function public.my_card()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select public.player_current_teams(auth.uid());
$$;
revoke all on function public.my_card() from public, anon;
grant execute on function public.my_card() to authenticated;

create or replace function public.admin_player_teams(p_player uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return public.player_current_teams(p_player);
end;
$$;
revoke all on function public.admin_player_teams(uuid) from public, anon;
grant execute on function public.admin_player_teams(uuid) to authenticated;
