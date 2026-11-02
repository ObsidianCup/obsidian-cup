-- =====================================================================
-- Obsidian Cup — 012: live-card switch, level chosen once
-- Safe to re-run. Run after 011_sports_choice_and_level.sql.
--
-- * site_settings: small on/off switches the organiser controls from the
--   organiser page. 'live_card' = show the moving logo, daily colour and
--   ticking clock on every player card (turned on for event days).
-- * playing_level: a player may choose it once (while it is empty). After
--   that only organisers can change it (admin_set_level, 011).
-- =====================================================================

create table if not exists public.site_settings (
  key text primary key check (key ~ '^[a-z_]{2,40}$'),
  on_off boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to authenticated;
drop policy if exists "site settings: signed-in read" on public.site_settings;
create policy "site settings: signed-in read" on public.site_settings for select to authenticated using (true);
insert into public.site_settings (key, on_off) values ('live_card', false) on conflict (key) do nothing;

create or replace function public.admin_set_switch(p_key text, p_on boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  insert into public.site_settings (key, on_off, updated_at) values (p_key, p_on, now())
  on conflict (key) do update set on_off = excluded.on_off, updated_at = now();
end;
$$;
revoke all on function public.admin_set_switch(text, boolean) from public, anon;
grant execute on function public.admin_set_switch(text, boolean) to authenticated;

-- Level: first choice by the player; afterwards organisers only.
create or replace function public.profiles_player_limits()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.is_admin() or auth.uid() is null) then
    if old.playing_level is not null then
      new.playing_level := old.playing_level;
    end if;
    if cardinality(old.sports) > 0 and cardinality(new.sports) = 0 then
      raise exception 'sports_required' using hint = 'Keep at least one sport.';
    end if;
  end if;
  return new;
end;
$$;
