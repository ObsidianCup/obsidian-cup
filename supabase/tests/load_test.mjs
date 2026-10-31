// Load test: many players at once against a real Postgres with the
// Supabase pieces simulated. Each request runs like Supabase's API does:
// one transaction, role "authenticated", the player's id in the JWT claim.
// Usage: PGHOST=... PGPORT=... PGUSER=postgres node load_test.mjs <repo> [players]
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || '.';
const N = Number(process.argv[3] || 1000);
const admin = new pg.Client({ database: 'postgres' });
await admin.connect();
await admin.query('drop database if exists oc_load');
await admin.query('create database oc_load');
await admin.end();

const pool = new pg.Pool({ database: 'oc_load', max: 60 });   // Supabase nano allows 60 connections
const setup = await pool.connect();
await setup.query(`
  do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`);
for (const f of fs.readdirSync(path.join(root, 'supabase/migrations')).sort()) {
  await setup.query(fs.readFileSync(path.join(root, 'supabase/migrations', f), 'utf8'));
}
await setup.query(fs.readFileSync(path.join(root, 'supabase/seed/legal_documents.sql'), 'utf8'));
setup.release();

async function asUser(uid, sql, params) {
  const c = await pool.connect();
  try {
    await c.query('begin');
    await c.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    await c.query('set local role authenticated');
    const r = await c.query(sql, params);
    await c.query('commit');
    return r;
  } catch (e) { await c.query('rollback').catch(() => {}); throw e; }
  finally { c.release(); }
}

const errors = {};
const note = (stage, e) => { const k = stage + ': ' + (e.code || '') + ' ' + e.message.slice(0, 90); errors[k] = (errors[k] || 0) + 1; };
async function stage(name, fn) {
  const t0 = Date.now();
  await Promise.all(Array.from({ length: N }, (_, i) => fn(i).catch(e => note(name, e))));
  const ms = Date.now() - t0;
  console.log(`${name.padEnd(42)} ${N} players in ${(ms / 1000).toFixed(1)}s (${Math.round(N / (ms / 1000))}/s)`);
}

// 1. Sign-ups (the trigger creates each profile)
const ids = [];
await stage('sign-up', async i => {
  const r = await pool.query(`insert into auth.users (email, email_confirmed_at) values ($1, now()) returning id`, [`player${i}@example.com`]);
  ids[i] = r.rows[0].id;
});
// 2. Consents
await stage('3 consents each', i => asUser(ids[i],
  `insert into public.consent_records (doc_key, doc_version, doc_lang) values ('terms','1.0','en'),('privacy','1.0','en'),('dob_declaration','1.1','en')`));
// 3. Names at the same moment; a third of players share the initials "MH"
await stage('save name -> player code (many same initials)', i => asUser(ids[i],
  `update public.profiles set legal_name = $2 where id = $1`, [ids[i], i % 3 === 0 ? 'Mohammad Hasan' : `Player Number ${i}`]));
// 4. Autosave bursts: 10 field saves per player
await stage('10 autosaves each', async i => {
  for (let k = 0; k < 10; k++) {
    await asUser(ids[i], `update public.profiles set phone = $2, school_club = $3 where id = $1`,
      [ids[i], `+88017${String(10000000 + i).slice(-8)}`, `School ${k}`]);
  }
});
// 5. Dashboard reads
await stage('load own profile + consents', async i => {
  await asUser(ids[i], `select * from public.profiles where id = $1`, [ids[i]]);
  await asUser(ids[i], `select * from public.my_consents`);
});

// 6. A third of players (all "MH") race for the same code at the same moment
let won = 0, lost = 0;
await stage('race for OC-MH777 (same code)', async i => {
  if (i % 3) return;
  try { await asUser(ids[i], `select public.choose_player_code('OC-MH777')`); won++; }
  catch (e) { if (/code_taken|code_limit/.test(e.message)) lost++; else throw e; }
});
// 7. The rest of them pick from their suggestions, retrying if someone beat them
let picked = 0;
await stage('pick a suggested code', async i => {
  if (i % 3) return;
  for (let k = 0; k < 5; k++) {
    const sug = (await asUser(ids[i], `select s from public.suggest_player_codes() s`)).rows.map(x => x.s);
    try { await asUser(ids[i], `select public.choose_player_code($1)`, [sug[0]]); picked++; return; }
    catch (e) { if (!/code_taken/.test(e.message)) throw e; }
  }
});
console.log(`OC-MH777: ${won} winner, ${lost} told it was taken | ${picked} picked a suggestion`);

// Checks
const r = await pool.query(`select count(*)::int total, count(player_code)::int with_code, count(distinct player_code)::int unique_codes,
  count(*) filter (where player_code like 'OC-MH%')::int mh from public.profiles`);
const dupe = await pool.query(`select count(*)::int n from public.profiles p join public.retired_player_codes r on r.code = p.player_code and r.profile_id <> p.id`);
console.log('codes reused after being given up:', dupe.rows[0].n);
const q = await pool.query(`select count(*)::int n from public.email_queue where template = 'welcome'`);
const c = await pool.query(`select count(*)::int n from public.consent_records`);
const leak = await asUser(ids[0], `select count(*)::int n from public.profiles`);
console.log('\nprofiles:', r.rows[0], '| welcome emails queued:', q.rows[0].n, '| consent records:', c.rows[0].n,
  '| rows player 0 can see:', leak.rows[0].n);
const errCount = Object.values(errors).reduce((a, b) => a + b, 0);
console.log(errCount ? '\nERRORS:\n' + Object.entries(errors).map(([k, v]) => `  ${v} × ${k}`).join('\n') : '\nno errors');
const okAll = dupe.rows[0].n === 0 && !errCount && won === 1 && picked > 0 && r.rows[0].with_code === N && r.rows[0].unique_codes === N && q.rows[0].n === N && c.rows[0].n === 3 * N && leak.rows[0].n === 1;
console.log(okAll ? 'PASS' : 'FAIL');
await pool.end();
process.exit(okAll ? 0 : 1);
