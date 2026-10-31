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
