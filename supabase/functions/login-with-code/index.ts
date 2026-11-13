// Obsidian Cup — log in with player code + password.
//
// The website sends { code, password }. This function, running on Supabase's
// servers, looks up the email for that code and signs in with it. The email
// never leaves the server, so typing someone's code reveals nothing about them.
// Failed tries are counted in the database (5 per code / 20 per address per
// 15 minutes), on top of Supabase's own login rate limits.
//
// Deploy: Supabase → Edge Functions → Deploy a new function → Via editor,
// name it login-with-code, paste this file, deploy. Then open its settings and
// turn OFF "Verify JWT" (visitors are not logged in yet). No keys to paste:
// Supabase gives the function its own keys automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';

// Only the live site may call this from a browser. (A local preview cannot
// log in with a code; use email + password there.)
const ALLOWED = ['https://obsidiancup.vercel.app'];
const MAX_BODY = 8 * 1024;          // a real request is a few hundred bytes
const MIN_ANSWER_MS = 450;          // every "no" takes at least this long

function key(names: string[], jsonName: string): string {
  for (const n of names) { const v = Deno.env.get(n); if (v) return v; }
  try {   // newer projects: {"default": "sb_..."}
    const all = JSON.parse(Deno.env.get(jsonName) || '{}');
    return all.default || Object.values(all)[0] || '';
  } catch { return ''; }
}
const URL_ = Deno.env.get('SUPABASE_URL')!;
const SECRET = key(['SUPABASE_SERVICE_ROLE_KEY'], 'SUPABASE_SECRET_KEYS');
const PUBLIC = key(['SUPABASE_ANON_KEY'], 'SUPABASE_PUBLISHABLE_KEYS');

function cors(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED.includes(origin) ? origin : ALLOWED[0],
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
}
const reply = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(origin), 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return reply({ error: 'method' }, 405, origin);
  // A browser always says which site the request came from. Another website
  // may not use this function with a visitor's browser.
  if (origin && !ALLOWED.includes(origin)) return reply({ error: 'origin' }, 403, origin);
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return reply({ error: 'bad_request' }, 415, origin);
  if (Number(req.headers.get('content-length') || 0) > MAX_BODY) return reply({ error: 'bad_request' }, 413, origin);
  const started = Date.now();
  // "No such code" answers faster than "wrong password" unless both wait the
  // same time, and that difference would reveal which codes exist.
  const no = async (body: unknown, status: number) => {
    const wait = MIN_ANSWER_MS - (Date.now() - started) + Math.floor(Math.random() * 120);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    return reply(body, status, origin);
  };

  let code = '', password = '', captchaToken: string | undefined;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return reply({ error: 'bad_request' }, 413, origin);
    const b = JSON.parse(raw);
    if (!b || typeof b !== 'object' || typeof b.code !== 'string' || typeof b.password !== 'string') return reply({ error: 'bad_request' }, 400, origin);
    code = String(b.code || '').trim().slice(0, 20);
    password = String(b.password || '').slice(0, 200);
    if (b.captchaToken) captchaToken = String(b.captchaToken).slice(0, 4096);
  } catch { return reply({ error: 'bad_request' }, 400, origin); }
  if (!code || password.length < 8) return reply({ error: 'invalid' }, 400, origin);
  // Player codes are letters, digits, dashes and spaces as people type them.
  // Anything else is not a code: same answer as a wrong one, without
  // touching the database.
  if (!/^[A-Za-z0-9 -]{3,20}$/.test(code)) return no({ error: 'invalid' }, 401);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const admin = createClient(URL_, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: email, error: lookErr } = await admin.rpc('login_code_lookup', { p_code: code, p_ip: ip });
  if (lookErr) {
    if (/too_many_attempts/.test(lookErr.message)) return reply({ error: 'too_many' }, 429, origin);
    console.error('lookup failed', lookErr.message);
    return reply({ error: 'server' }, 500, origin);
  }

  let session = null;
  if (email) {
    const auth = createClient(URL_, PUBLIC || SECRET, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: email as string, password, options: { captchaToken } });
    if (error && /rate|too many/i.test(error.message)) return reply({ error: 'too_many' }, 429, origin);
    session = error ? null : data.session;
  }
  await admin.rpc('login_code_record', { p_code: code, p_ip: ip, p_ok: !!session });

  // Same answer for "no such code", "wrong password" and a failed anti-bot
  // check, so the answer never reveals whether a code exists.
  if (!session) return no({ error: 'invalid' }, 401);
  return reply({ access_token: session.access_token, refresh_token: session.refresh_token }, 200, origin);
});
