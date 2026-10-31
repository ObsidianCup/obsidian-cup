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
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
const as = async (who) => {          // who: uuid | 'anon' | null(owner)
  await db.exec('reset role');
  if (who === null) { await db.query(`select set_config('request.jwt.claim.sub', '', false)`); return; }
  if (who === 'anon') { await db.query(`select set_config('request.jwt.claim.sub', '', false)`); await db.exec('set role anon'); return; }
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [who]);
  await db.exec('set role authenticated');
};

await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/001_foundation.sql'), 'utf8'));
await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/001_foundation.sql'), 'utf8')); // re-run is safe
for (const f of fs.readdirSync(path.join(root, 'supabase/migrations')).sort()) {
  await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8'));
}
await db.exec(fs.readFileSync(path.join(root, 'supabase/seed/legal_documents.sql'), 'utf8'));
await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/002_reserved_codes.sql'), 'utf8'));
await db.exec(fs.readFileSync(path.join(root, 'supabase/migrations/003_dob_change_limit.sql'), 'utf8'));
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

console.log('\nAdmin');
await as(ADMIN);
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
await as(FAKE);
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
