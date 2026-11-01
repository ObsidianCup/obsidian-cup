-- =====================================================================
-- Obsidian Cup — 010: profile photo, player card QR and gate check
-- Safe to re-run. Run after 009_events_and_teams.sql.
--
-- * Profile photo (optional): one small square picture per player, kept in a
--   PRIVATE storage bucket "avatars" at <player id>/avatar.webp. Only the
--   player and organisers can see it. Under-13s can add one only after a
--   parent or guardian has consented (same rule as the sports profile, 007).
-- * Player card QR: every player has a private random card_token. The QR on
--   the card is a link to /pages/check.html#t=<token>. The token says nothing
--   about the player by itself, and the player can replace it (old QR stops
--   working) if a screenshot ends up somewhere it should not.
-- * Gate check: check_player(token) returns who the card belongs to, only to
--   an organiser who passed two-step login (is_admin, 006). Everyone else
--   gets nothing.
-- =====================================================================

alter table public.profiles add column if not exists card_token uuid not null default gen_random_uuid();
create unique index if not exists profiles_card_token on public.profiles (card_token);
-- 0 = no photo; goes up by one with every new photo (so old copies are not shown from a cache).
alter table public.profiles add column if not exists avatar_version int not null default 0 check (avatar_version >= 0);

grant update (avatar_version) on public.profiles to authenticated;
-- card_token is deliberately NOT updatable directly; use new_card_token().

-- Under-13s without guardian consent cannot add a photo. A separate trigger,
-- so the main profiles_guard (007) stays as it is.
create or replace function public.profiles_avatar_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.avatar_version > coalesce(old.avatar_version, 0)
     and not (public.is_admin() or auth.uid() is null)
     and (new.date_of_birth is null
          or (public.age_on(new.date_of_birth) < 13 and new.guardian_consent_at is null)) then
    raise exception 'guardian_required_under_13'
      using hint = 'Players under 13 need a parent or guardian''s consent before adding a photo.';
  end if;
  if tg_op = 'UPDATE' and new.card_token is distinct from old.card_token
     and coalesce(current_setting('oc.allow_card_token', true), '') <> '1'
     and not (auth.uid() is null) then
    new.card_token := old.card_token;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_avatar_guard on public.profiles;
create trigger profiles_avatar_guard before update on public.profiles
  for each row execute function public.profiles_avatar_guard();

-- The player replaces their own QR (the old one stops working at once).
create or replace function public.new_card_token()
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare t uuid := gen_random_uuid();
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  perform set_config('oc.allow_card_token', '1', true);
  update public.profiles set card_token = t where id = auth.uid();
  perform set_config('oc.allow_card_token', '', true);
  return t;
end;
$$;
revoke all on function public.new_card_token() from public, anon;
grant execute on function public.new_card_token() to authenticated;

-- Gate check: organisers only (two-step login). Returns one row, or nothing.
create or replace function public.check_player(token uuid)
returns table (
  player_id uuid, name text, legal_name text, player_code text, age int, gender text,
  verified boolean, under_18 boolean, guardian_ok boolean, avatar_version int, teams jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'organisers_only' using hint = 'Only Obsidian Cup organisers can check player cards.';
  end if;
  return query
    select p.id,
           coalesce(nullif(trim(p.display_name), ''), p.legal_name),
           p.legal_name,
           p.player_code,
           public.age_on(p.date_of_birth),
           p.gender,
           p.verified_at is not null,
           coalesce(public.age_on(p.date_of_birth) < 18, false),
           p.guardian_consent_at is not null,
           p.avatar_version,
           coalesce((
             select jsonb_agg(jsonb_build_object('team', t.name, 'event', e.name, 'category', c.name,
                                                 'status', m.status, 'jersey', m.jersey_number)
                              order by e.starts_on desc nulls last)
               from public.team_members m
               join public.teams t on t.id = m.team_id
               join public.events e on e.id = m.event_id
               join public.event_categories c on c.id = t.category_id
              where m.player_id = p.id
                and m.status in ('requested', 'approved')
                and e.status <> 'done'), '[]'::jsonb)
      from public.profiles p
     where p.card_token = token;
end;
$$;
revoke all on function public.check_player(uuid) from public, anon;
grant execute on function public.check_player(uuid) to authenticated;

-- May the logged-in player store a photo? Date of birth entered, and 13+ or guardian consent.
create or replace function public.may_have_avatar()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.date_of_birth is not null
       and (public.age_on(p.date_of_birth) >= 13 or p.guardian_consent_at is not null)
  );
$$;
revoke all on function public.may_have_avatar() from public, anon;
grant execute on function public.may_have_avatar() to authenticated;

-- ---------------------------------------------------------------------
-- Storage: private bucket for profile photos (skipped where there is no
-- Supabase storage, e.g. the local tests run it against a stand-in).
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('avatars', 'avatars', false, 400000, array['image/webp', 'image/jpeg'])
    on conflict (id) do update set public = false, file_size_limit = 400000,
                                   allowed_mime_types = array['image/webp', 'image/jpeg'];

    drop policy if exists "avatars: player and organisers read" on storage.objects;
    create policy "avatars: player and organisers read" on storage.objects
      for select to authenticated
      using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

    drop policy if exists "avatars: player adds own" on storage.objects;
    create policy "avatars: player adds own" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatars' and name = auth.uid()::text || '/avatar.webp'
                  and public.may_have_avatar());

    drop policy if exists "avatars: player replaces own" on storage.objects;
    create policy "avatars: player replaces own" on storage.objects
      for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'avatars' and name = auth.uid()::text || '/avatar.webp'
                  and public.may_have_avatar());

    drop policy if exists "avatars: player or organiser removes" on storage.objects;
    create policy "avatars: player or organiser removes" on storage.objects
      for delete to authenticated
      using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
  end if;
end
$$;
