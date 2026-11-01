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
