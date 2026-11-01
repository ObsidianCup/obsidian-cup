// Security tests for the Supabase setup, run against an in-memory Postgres
// with Supabase's auth pieces simulated. Usage (from a folder with
// @electric-sql/pglite installed):  node rls_test.mjs <repo-root>
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.';
const db = new PGlite();
let pass = 0, fail = 0;
const ok = (cond, name) => { if (cond) { pass++; console.log('  ok   ', name); } else { fail++; console.log('  FAIL ', name); } };
const expectError = async (sql, params, pattern, name) => {
  try { await db.query(sql, params); ok(false, name + ' (no error)'); }
  catch (e) { ok(pattern.test(e.message), name + (pattern.test(e.message) ? '' : ' — got: ' + e.message)); }
};

// --- Simulate Supabase -------------------------------------------------
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  grant execute on function auth.jwt() to anon, authenticated;
`);
const as = async (who, aal = 'aal1') => {   // who: uuid | 'anon' | null(owner); aal2 = passed two-step login
  await db.exec('reset role');
  await db.query(`select set_config('request.jwt.claims', '', false)`);
  if (who === null) { await db.query(`select set_config('request.jwt.claim.sub', '', false)`); return; }
  if (who === 'anon') { await db.query(`select set_config('request.jwt.claim.sub', '', false)`); await db.exec('set role anon'); return; }
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [who]);
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [JSON.stringify({ sub: who, aal })]);
  await db.exec('set role authenticated');
};

await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/001_foundation.sql'), 'utf8'));
await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/001_foundation.sql'), 'utf8')); // re-run is safe
for (const f of fs.readdirSync(path.join(root, 'supabase/migrations')).sort()) {
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8'));
}
await db.exec(fs.readFileSync(path.join(root, 'supabase/seed/legal_documents.sql'), 'utf8'));
for (const f of fs.readdirSync(path.join(root, 'supabase/migrations')).sort()) {   // whole setup re-run is safe
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8'));
}
console.log('setup ran twice without errors');

// --- Users -------------------------------------------------------------
const mk = async (email, confirmed = true) =>
  (await db.query(`insert into auth.users (email, email_confirmed_at) values ($1, $2) returning id`,
    [email, confirmed ? new Date() : null])).rows[0].id;
const A = await mk('alice@example.com');
const B = await mk('bob@example.com');
const ADMIN = await mk('ObsidianCup.Official@gmail.com');
const KID = await mk('kid@example.com');

await as(null);
ok((await db.query('select count(*)::int n from public.profiles')).rows[0].n === 4, 'sign-up creates an empty profile for each user');

console.log('\nPlayer A, own profile');
await as(A);
await db.query(`update public.profiles set legal_name = 'Alice Bonnie Carter', date_of_birth = '2000-05-01', phone = '+880 1711 000000' where id = $1`, [A]);
let me = (await db.query('select * from public.profiles where id = $1', [A])).rows[0];
ok(/^OC-ABC[2-9]{3}$/.test(me.player_code), 'player code made from initials: ' + me.player_code);
await db.query(`update public.profiles set legal_name = 'Zed Q' where id = $1`, [A]);
me = (await db.query('select * from public.profiles where id = $1', [A])).rows[0];
ok(/^OC-ABC/.test(me.player_code), 'player code never changes after a name change');
await expectError(`update public.profiles set player_code = 'OC-HACK1' where id = $1`, [A], /permission denied/, 'cannot set own player code');
await expectError(`update public.profiles set verified_at = now() where id = $1`, [A], /permission denied/, 'cannot verify self');
await expectError(`update public.profiles set email = 'x@y.z' where id = $1`, [A], /permission denied/, 'cannot change stored email directly');
await expectError(`update public.profiles set phone = 'not a phone' where id = $1`, [A], /check constraint/, 'invalid phone rejected');

console.log('\nPlayer A, other people\'s data');
ok((await db.query('select * from public.profiles where id = $1', [B])).rows.length === 0, 'cannot read another player');
ok((await db.query('select * from public.profiles')).rows.length === 1, 'listing all profiles shows only own');
const upd = await db.query(`update public.profiles set legal_name = 'Hacked' where id = $1`, [B]);
ok(upd.affectedRows === 0, 'cannot edit another player');
await expectError(`delete from public.profiles where id = $1`, [A], /permission denied/, 'cannot delete profiles');
await expectError(`insert into public.profiles (id) values (gen_random_uuid())`, [], /permission denied/, 'cannot create profiles directly');
await expectError(`select * from public.admins`, [], /permission denied/, 'cannot read admin list');
await expectError(`insert into public.admins values ('alice@example.com')`, [], /permission denied/, 'cannot make self admin');
ok((await db.query('select * from public.email_queue')).rows.length === 0, 'cannot read email queue');
ok((await db.query('select public.is_admin() a')).rows[0].a === false, 'is_admin false for a player');
ok((await db.query('select public.is_admin_email() a')).rows[0].a === false, 'is_admin_email false for a player');
await as(A, 'aal2');
ok((await db.query('select public.is_admin() a')).rows[0].a === false, 'a player with two-step login is still not admin');
await as(A);
await expectError(`select public.admin_set_verified($1, true)`, [B], /not_admin/, 'admin action refused for a player');

console.log('\nConsent records');
await db.query(`insert into public.consent_records (doc_key, doc_version, doc_lang) values ('terms','1.0','en')`);
const c = (await db.query(`select * from public.consent_records`)).rows;
ok(c.length === 1 && c[0].user_id === A && c[0].email === 'alice@example.com' && c[0].doc_sha256?.length === 64, 'consent stamped with own id, email and fingerprint');
await expectError(`insert into public.consent_records (user_id, doc_key, doc_version, doc_lang) values ($1,'terms','1.0','en')`, [B], /permission denied/, 'cannot record consent as someone else');
await expectError(`update public.consent_records set choice = 'declined'`, [], /permission denied/, 'consent records cannot be edited');
await expectError(`delete from public.consent_records`, [], /permission denied/, 'consent records cannot be deleted');
await expectError(`insert into public.consent_records (doc_key, doc_version, doc_lang) values ('fake','9','en')`, [], /foreign key/, 'cannot consent to a document that does not exist');
ok((await db.query(`select * from public.my_consents`)).rows.length === 1, 'my_consents shows own latest choices');

console.log('\nPlayer B');
await as(B);
await db.query(`insert into public.consent_records (doc_key, doc_version, doc_lang) values ('privacy','1.0','en')`);
ok((await db.query(`select * from public.consent_records`)).rows.length === 1, 'B sees only own consent records');
ok((await db.query(`select * from public.my_consents`)).rows.length === 1, 'B my_consents only own');
await db.query(`update public.profiles set legal_name = 'Bob Dylan', date_of_birth = '1999-01-01' where id = $1`, [B]);

console.log('\nUnder 13');
await as(KID);
await db.query(`update public.profiles set legal_name = 'Kid Kay', date_of_birth = $2 where id = $1`, [KID, new Date(Date.now() - 10 * 365.25 * 864e5).toISOString().slice(0, 10)]);
await expectError(`update public.profiles set phone = '+8801711000000' where id = $1`, [KID], /guardian_required_under_13/, 'under-13 cannot add phone before guardian consent');
await expectError(`update public.profiles set media_feature = true where id = $1`, [KID], /guardian_required_under_13/, 'under-13 cannot opt into media feature');

console.log('\nAnonymous visitor');
await as('anon');
await expectError(`select * from public.profiles`, [], /permission denied/, 'anon cannot read profiles');
await expectError(`select * from public.consent_records`, [], /permission denied/, 'anon cannot read consent records');
ok((await db.query(`select count(*)::int n from public.legal_documents`)).rows[0].n >= 10, 'anon can read the list of legal documents');

console.log('\nAdmin without the two-step code');
await as(ADMIN, 'aal1');
ok((await db.query('select public.is_admin() a')).rows[0].a === false, 'admin password alone gives no admin powers');
ok((await db.query('select public.is_admin_email() a')).rows[0].a === true, 'admin page can tell it should ask for the code');
ok((await db.query('select * from public.profiles')).rows.length === 1, 'without the code an admin sees only their own profile');
await expectError(`select public.admin_set_verified($1, true)`, [B], /not_admin/, 'without the code admin actions are refused');

console.log('\nAdmin');
await as(ADMIN, 'aal2');
ok((await db.query('select public.is_admin() a')).rows[0].a === true, 'admin recognised (email case ignored)');
ok((await db.query('select * from public.profiles')).rows.length === 4, 'admin sees all profiles');
await db.query(`select public.admin_set_verified($1, true)`, [B]);
ok((await db.query('select verified_at from public.profiles where id = $1', [B])).rows[0].verified_at !== null, 'admin can verify a player');
ok((await db.query('select * from public.email_queue')).rows.filter(r => r.template === 'welcome').length === 3, 'welcome emails queued for players with codes');
await as(B);
await expectError(`update public.profiles set date_of_birth = '2010-01-01' where id = $1`, [B], /locked_after_verification/, 'verified player cannot change date of birth');
await db.query(`update public.profiles set phone = '+8801800000000' where id = $1`, [B]);
ok((await db.query('select phone from public.profiles where id = $1', [B])).rows[0].phone === '+8801800000000', 'verified player can still edit phone');

console.log('\nUnconfirmed email pretending to be admin');
await as(null);
await db.query(`delete from auth.users where id = $1`, [ADMIN]);
const FAKE = await mk('obsidiancup.official@gmail.com', false);
await as(FAKE, 'aal2');
ok((await db.query('select public.is_admin() a')).rows[0].a === false, 'unconfirmed admin email gets no admin rights');

console.log('\nReserved and changed player codes');
await as(null);
await db.query(`insert into public.reserved_player_codes (email, code) values ('uriana@example.com', 'OC-UF023')`);
const U = await mk('Uriana@Example.com');
await as(U);
await expectError(`select * from public.reserved_player_codes`, [], /permission denied/, 'players cannot see reserved codes');
await db.query(`update public.profiles set legal_name = 'Uriana Faiha' where id = $1`, [U]);
ok((await db.query('select player_code from public.profiles where id = $1', [U])).rows[0].player_code === 'OC-UF023', 'reserved code given on first name save');
await as(null);
const Other = await mk('other@example.com');
await as(Other);
await db.query(`update public.profiles set legal_name = 'Ursula Fox' where id = $1`, [Other]);
ok((await db.query('select player_code from public.profiles where id = $1', [Other])).rows[0].player_code !== 'OC-UF023', 'nobody else gets a reserved code');
await as(null);
await db.query(`update public.profiles set player_code = 'OC-ZZ999' where id = $1`, [A]);
ok((await db.query('select player_code from public.profiles where id = $1', [A])).rows[0].player_code === 'OC-ZZ999', 'organiser (SQL Editor) can change a code');
const q = (await db.query(`select data->>'player_code' c from public.email_queue where to_email = 'alice@example.com' and template = 'welcome'`)).rows;
ok(q.length === 1 && q[0].c === 'OC-ZZ999', 'queued welcome email shows the changed code');
await expectError(`update public.profiles set player_code = 'bad code' where id = $1`, [A], /check constraint/, 'badly formatted code rejected');
await as(A);
await expectError(`update public.profiles set player_code = 'OC-AA222' where id = $1`, [A], /permission denied/, 'player still cannot change own code');

console.log('\nDate of birth change limit');
await as(null);
const D = await mk('dob@example.com');
await as(D);
await db.query(`update public.profiles set date_of_birth = '2001-01-01' where id = $1`, [D]);
await db.query(`update public.profiles set date_of_birth = '2001-01-02' where id = $1`, [D]);
await db.query(`update public.profiles set date_of_birth = '2001-01-03' where id = $1`, [D]);
ok((await db.query('select dob_changes from public.profiles where id = $1', [D])).rows[0].dob_changes === 2, 'first entry free, then two changes counted');
await expectError(`update public.profiles set date_of_birth = '2001-01-04' where id = $1`, [D], /dob_change_limit/, 'third change refused');
await db.query(`update public.profiles set phone = '+358 40 1234567' where id = $1`, [D]);
ok(true, 'other fields still save after the limit');
await expectError(`update public.profiles set dob_changes = 0 where id = $1`, [D], /permission denied/, 'player cannot reset the counter');
await as(null);
await db.query(`update public.profiles set date_of_birth = '2001-01-05' where id = $1`, [D]);
ok((await db.query('select date_of_birth::text d from public.profiles where id = $1', [D])).rows[0].d === '2001-01-05', 'organiser can still correct it');

console.log('\nSports profile');
await as(A);
await db.query(`update public.profiles set height_cm = 178, weight_kg = 70, standing_reach_cm = 230, vertical_jump_cm = 55, dominant_hand = 'right', dominant_foot = 'left', playing_level = 'club', playing_since = 2019, preferred_jersey = 7, shirt_size = 'M', bio = 'Setter from Mirpur', show_sport_stats = true where id = $1`, [A]);
ok((await db.query('select height_cm, playing_level from public.profiles where id = $1', [A])).rows[0].height_cm === 178, 'player saves a sports profile');
await expectError(`update public.profiles set height_cm = 40 where id = $1`, [A], /check constraint/, 'impossible height refused');
await expectError(`update public.profiles set preferred_jersey = 100 where id = $1`, [A], /check constraint/, 'jersey over 99 refused');
await expectError(`update public.profiles set dominant_hand = 'feet' where id = $1`, [A], /check constraint/, 'unknown playing hand refused');
await expectError(`update public.profiles set playing_since = 2099 where id = $1`, [A], /playing_since_future/, 'start year in the future refused');
await expectError(`update public.profiles set bio = repeat('x', 281) where id = $1`, [A], /check constraint/, 'bio over 280 characters refused');
await db.query(`update public.profiles set weight_kg = null where id = $1`, [A]);
ok((await db.query('select weight_kg from public.profiles where id = $1', [A])).rows[0].weight_kg === null, 'player can clear a sports detail');
await as(B);
ok((await db.query(`update public.profiles set height_cm = 150 where id = $1`, [A])).affectedRows === 0, 'cannot edit another player\'s sports profile');
await as(KID);
await expectError(`update public.profiles set height_cm = 140 where id = $1`, [KID], /guardian_required_under_13/, 'under-13 cannot add a sports profile before guardian consent');

console.log('\nPlayers choose their own code');
await as(null);
const P = await mk('pick@example.com');
const Q = await mk('quick@example.com');
await as(P);
await db.query(`update public.profiles set legal_name = 'Priya Kaur' where id = $1`, [P]);
const auto = (await db.query('select player_code from public.profiles where id = $1', [P])).rows[0].player_code;
ok(/^OC-PK[2-9]{3}$/.test(auto), 'gets an automatic code first: ' + auto);
const sugg = (await db.query('select * from public.suggest_player_codes() s')).rows.map(r => r.s);
ok(sugg.length >= 4 && sugg.every(c => /^OC-PK[0-9]{3,4}$/.test(c) && c !== auto), 'suggestions use own initials: ' + sugg.join(' '));
const st = async c => (await db.query('select public.player_code_status($1) s', [c])).rows[0].s;
ok(await st('OC-PK777') === 'ok', 'free code is available');
ok(await st('oc-pk 777') === 'ok', 'lower case and spaces are fine');
ok(await st('OC-AB777') === 'initials', 'code with someone else\'s initials refused');
ok(await st('OC-PK7') === 'format', 'too few digits refused');
ok(await st('OC-PK77777') === 'format', 'too many digits refused');
ok(await st('OC-UF023') === 'initials', 'reserved founder code refused');
ok((await db.query(`select public.choose_player_code('OC-PK777') c`)).rows[0].c === 'OC-PK777', 'player takes OC-PK777');
let pk = (await db.query('select player_code, code_changes from public.profiles where id = $1', [P])).rows[0];
ok(pk.player_code === 'OC-PK777' && pk.code_changes === 1, 'code changed and counted');
ok((await db.query(`select data->>'player_code' c from public.email_queue where template = 'welcome'`)).rows.length === 0, 'player still cannot read the email queue');
await as(Q);
await db.query(`update public.profiles set legal_name = 'Pavel Kim' where id = $1`, [Q]);
ok(await st('OC-PK777') === 'taken', 'someone else sees OC-PK777 as taken');
ok(await st(auto) === 'taken', 'the code Priya gave up is retired, not reusable: ' + auto);
await expectError(`select public.choose_player_code('OC-PK777')`, [], /code_taken/, 'cannot grab a taken code');
await expectError(`update public.profiles set code_changes = 0 where id = $1`, [Q], /permission denied/, 'player cannot reset the change counter');
await as(P);
await db.query(`select public.choose_player_code('OC-PK2026')`);
ok(await st('OC-PK123') === 'limit', 'after 2 changes no more');
await expectError(`select public.choose_player_code('OC-PK123')`, [], /code_limit/, 'third change refused');
await db.query(`update public.profiles set legal_name = 'Priya K' where id = $1`, [P]);
ok((await db.query('select player_code from public.profiles where id = $1', [P])).rows[0].player_code === 'OC-PK2026', 'normal profile saves do not touch the code');
await as(null);
const welcome = (await db.query(`select template, data->>'player_code' c from public.email_queue where to_email = 'pick@example.com' order by id`)).rows;
ok(welcome.length === 1 && welcome[0].c === 'OC-PK2026', 'unsent welcome email shows the latest code');
await db.query(`update public.email_queue set sent_at = now() where to_email = 'pick@example.com'`);
await db.query(`update public.profiles set player_code = 'OC-PK555' where id = $1`, [P]);
ok((await db.query(`select * from public.email_queue where to_email = 'pick@example.com' and template = 'code_changed'`)).rows.length === 1, 'after the welcome email went out, a code-changed email is queued');
await as('anon');
await expectError(`select public.player_code_status('OC-PK999')`, [], /permission denied/, 'visitors cannot check codes');
await expectError(`select public.choose_player_code('OC-PK999')`, [], /permission denied/, 'visitors cannot choose codes');

console.log('\nLogin with player code (server side)');
await as(A);
await expectError(`select public.login_code_lookup('OC-PK555', '1.2.3.4')`, [], /permission denied/, 'players cannot look up emails by code');
await as('anon');
await expectError(`select public.login_code_lookup('OC-PK555', '1.2.3.4')`, [], /permission denied/, 'visitors cannot look up emails by code');
await expectError(`select * from public.login_code_attempts`, [], /permission denied/, 'visitors cannot read login attempts');
await db.exec('reset role'); await db.exec('set role service_role');
const look = async (c, ip) => (await db.query('select public.login_code_lookup($1, $2) e', [c, ip])).rows[0].e;
ok(await look('pk555', '1.2.3.4') === 'pick@example.com', 'server finds the email for a code typed loosely ("pk555")');
ok(await look('OC-ZZ000', '1.2.3.4') === null, 'unknown code gives nothing');
for (let i = 0; i < 5; i++) await db.query(`select public.login_code_record('OC-PK555', '9.9.9.9', false)`);
await expectError(`select public.login_code_lookup('OC-PK555', '5.5.5.5')`, [], /too_many_attempts/, '5 wrong passwords lock that code for 15 minutes');
ok(await look('OC-UF023', '5.5.5.5') === 'uriana@example.com', 'other codes still work');
for (let i = 0; i < 20; i++) await db.query(`select public.login_code_record($1, '7.7.7.7', false)`, ['OC-X' + (100 + i)]);
await expectError(`select public.login_code_lookup('OC-UF023', '7.7.7.7')`, [], /too_many_attempts/, '20 failures from one address block that address');

console.log('\nEvents and teams');
await as(null);
const mkp = async (email, name, dob, gender) => { const id = await mk(email); await db.query(`update public.profiles set legal_name=$2, date_of_birth=$3, gender=$4 where id=$1`, [id, name, dob, gender]); return id; };
const CAP = await mkp('cap@example.com', 'Rina Akter', '2005-05-05', 'female');
const P1 = await mkp('p1@example.com', 'Mim Khan', '2006-01-01', 'female');
const P2 = await mkp('p2@example.com', 'Tania Islam', '2004-02-02', 'female');
const BOY = await mkp('boy@example.com', 'Rafi Hasan', '2005-03-03', 'male');
const OLD = await mkp('old@example.com', 'Nadia Old', '1980-03-03', 'female');
const ADM2 = await mk('ObsidianCup.Official@gmail.com');
await as(ADM2, 'aal1');
await expectError(`insert into public.events (slug, name, sport) values ('s5','x','volleyball')`, [], /row-level security|permission denied/, 'admin without two-step cannot create events');
await as(ADM2, 'aal2');
const EV5 = (await db.query(`insert into public.events (slug, name, sport, starts_on, status) values ('ovc-s5', 'Obsidian Volleyball Cup Season 5', 'volleyball', '2027-02-01', 'open') returning id`)).rows[0].id;
const CATG = (await db.query(`insert into public.event_categories (event_id, name, gender, max_age, min_players, max_players, special_role, max_special) values ($1, 'Girls U23', 'female', 23, 2, 3, 'libero', 1) returning id`, [EV5])).rows[0].id;
const codes = (await db.query(`select * from public.admin_issue_captain_codes($1, 2, 'test') c`, [CATG])).rows.map(r => r.c);
ok(codes.length === 2 && codes.every(c => /^CAP-[A-Z2-9]{8}$/.test(c)), 'organiser issues captain codes: ' + codes.join(' '));
await as(P1);
ok((await db.query(`select * from public.captain_codes`)).rows.length === 0, 'players cannot see captain codes');
ok((await db.query(`select * from public.events`)).rows.some(r => r.slug === 'ovc-s5'), 'players can see open events');
await expectError(`select public.admin_issue_captain_codes($1, 1)`, [CATG], /not_admin/, 'players cannot issue captain codes');
await as(BOY);
await expectError(`select public.create_team($1, 'Boys Try')`, [codes[0]], /not_eligible_gender/, 'wrong gender cannot captain a girls team');
await as(CAP);
const TEAM = (await db.query(`select public.create_team($1, 'Night Owls') t`, [codes[0].toLowerCase()])).rows[0].t;
ok(!!TEAM, 'captain creates a team with the code (case ignored)');
await expectError(`select public.create_team($1, 'Again')`, [codes[0]], /captain_code_invalid/, 'a captain code works only once');
const JC = (await db.query(`select join_code from public.teams where id = $1`, [TEAM])).rows[0].join_code;
ok(/^T-[A-Z2-9]{6}$/.test(JC), 'team gets a join code ' + JC);
await as(P1); await db.query(`select public.request_join($1)`, [JC.toLowerCase()]);
await as(P2); await db.query(`select public.request_join($1)`, [JC]);
await as(OLD); await expectError(`select public.request_join($1)`, [JC], /not_eligible_too_old/, 'too old for U23 cannot join');
await as(P1);
await expectError(`select public.captain_decide($1, $2, true)`, [TEAM, P2], /not_captain/, 'only the captain approves');
await expectError(`update public.team_members set status = 'approved'`, [], /permission denied/, 'no direct changes to team members');
await as(CAP);
await db.query(`select public.captain_decide($1, $2, true)`, [TEAM, P1]);
await db.query(`select public.captain_decide($1, $2, true)`, [TEAM, P2]);
await as(null); const P3 = await mkp('p3@example.com', 'Sara Ali', '2007-07-07', 'female'); await as(P3); await db.query(`select public.request_join($1)`, [JC]);
await as(CAP);
await expectError(`select public.captain_decide($1, $2, true)`, [TEAM, P3], /squad_full/, 'squad size limit enforced (max 3)');
await db.query(`select public.captain_set_player($1, $2, 7::smallint, true)`, [TEAM, P1]);
await expectError(`select public.captain_set_player($1, $2, 8::smallint, true)`, [TEAM, P2], /special_limit/, 'only 1 libero allowed here');
await expectError(`select public.captain_set_player($1, $2, 7::smallint, false)`, [TEAM, P2], /jersey_taken/, 'jersey numbers are unique in a team');
const roster = (await db.query(`select * from public.team_roster($1)`, [TEAM])).rows;
ok(roster.length === 4 && !('phone' in roster[0]) && !('date_of_birth' in roster[0]), 'captain roster has no phone or date of birth');
ok(roster.find(r => r.player_id === P1).guardian_needed === false, 'roster says who still needs guardian consent');
await as(null); const SECOND = (await db.query(`select id from public.event_categories where id = $1`, [CATG])).rows[0].id;
await as(P3);
await expectError(`select public.create_team($1, 'Night Owls')`, [codes[1]], /already_in_team/, 'a player waiting on one team cannot captain another in the same event');
await db.query(`select public.leave_team($1)`, [TEAM]);
await expectError(`select public.create_team($1, 'night owls ')`, [codes[1]], /team_name_taken/, 'team names are unique in a category (case and spaces ignored)');
ok((await db.query(`select * from public.teams`)).rows.length === 0, 'a player outside a team cannot see it');
await as(P2);
ok((await db.query(`select * from public.team_roster($1)`, [TEAM])).rows.every(r => r.problem === null || r.player_id === P2), 'teammates do not see each other\'s eligibility problems');
await as(CAP); await expectError(`select public.leave_team($1)`, [TEAM], /captain_cannot_leave/, 'captain cannot walk away from the team');
await as(ADM2, 'aal2'); await db.query(`update public.events set status = 'closed' where id = $1`, [EV5]);
await as(null); const LATE = await mkp('late@example.com', 'Late Comer', '2006-06-06', 'female');
await as(LATE); await expectError(`select public.request_join($1)`, [JC], /registration_closed/, 'no joining after registration closes');

console.log('\nEmail sender');
await as(A);
await expectError(`select * from public.email_claim(10)`, [], /permission denied/, 'players cannot claim emails');
await as('anon');
await expectError(`select public.email_done(1, true)`, [], /permission denied/, 'visitors cannot mark emails sent');
await db.exec('reset role');
await db.exec('grant usage on schema public to service_role; grant all on all tables in schema public to service_role;'); // as on Supabase
await db.exec('set role service_role');
const before = (await db.query(`select count(*)::int n from public.email_queue where sent_at is null`)).rows[0].n;
const c1 = (await db.query(`select * from public.email_claim(2)`)).rows;
const c2 = (await db.query(`select * from public.email_claim(50)`)).rows;
ok(c1.length === 2 && !c2.some(r => c1.find(x => x.id === r.id)), 'two runs never get the same email');
await db.query(`select public.email_done($1, true)`, [c1[0].id]);
await db.query(`select public.email_done($1, false, 'smtp down')`, [c1[1].id]);
const r1 = (await db.query(`select sent_at, claimed_at from public.email_queue where id = $1`, [c1[1].id])).rows[0];
ok(r1.sent_at === null && r1.claimed_at === null, 'a failed email is released for the next run');
ok((await db.query(`select * from public.email_claim(50, 1)`)).rows.length === 0, 'daily cap stops sending');
await db.query(`update public.email_queue set attempts = 5, claimed_at = null where id = $1`, [c1[1].id]);
ok(!(await db.query(`select * from public.email_claim(50)`)).rows.some(r => r.id === c1[1].id), 'an email that failed 5 times is not tried again');
ok(before >= 3, 'queue had emails to send: ' + before);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
