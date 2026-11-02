-- 013: a team captain must be at least 18 on the first day of the event.
-- Safe to run again. Only create_team changes; the code itself is not used up
-- when this check fails.

create or replace function public.create_team(p_captain_code text, p_team_name text)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  cc public.captain_codes; cat public.event_categories; ev public.events; dob date; t uuid; why text; jc text;
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
  select * into ev from public.events where id = cat.event_id;
  select date_of_birth into dob from public.profiles where id = auth.uid();
  if dob is null or public.age_on(dob, coalesce(ev.starts_on, current_date)) < 18 then
    raise exception 'captain_under_18';
  end if;
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
