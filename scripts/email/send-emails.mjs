// Sends queued emails (public.email_queue) through Gmail.
// Run every 15 minutes by .github/workflows/send-emails.yml.
// Never logs email addresses or names: the repository and its logs are public.
import nodemailer from 'nodemailer';
import { render } from './templates.mjs';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
const BATCH = Number(process.env.EMAIL_BATCH || 50);
// EMAIL_MODE: 'off' sends nothing; 'test' (the default) sends only to the
// addresses in EMAIL_TEST_TO and leaves everything else waiting; 'live'
// sends to players. Set it in GitHub: Settings > Secrets and variables >
// Actions > Variables.
const MODE = (process.env.EMAIL_MODE || 'test').toLowerCase();
const TEST_TO = (process.env.EMAIL_TEST_TO || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);

export async function run({ fetchImpl = fetch, transport, log = console.log } = {}) {
  if (!URL_ || !KEY || !GMAIL_USER || !GMAIL_PASS) {
    log('Email sender is not set up yet (missing secrets). Nothing sent.');
    return { sent: 0, failed: 0, skipped: true };
  }
  const headers = { 'Content-Type': 'application/json', apikey: KEY };
  if (KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${KEY}`;   // older service_role keys
  const rpc = async (fn, body) => {
    const r = await fetchImpl(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${fn} failed with status ${r.status}`);
    return r.status === 204 ? null : r.json();
  };

  // Accounts whose 14 days are up: retire the code, queue the goodbye email,
  // remove the photo, then delete the login (the profile goes with it).
  // Runs whatever the email mode is. Logs only counts.
  let deleted = 0;
  try {
    const due = (await rpc('due_account_deletions', {})) || [];
    for (const id of due) {
      try {
        if (!(await rpc('finish_account_deletion', { p_user: id }))) continue;
        await fetchImpl(`${URL_}/storage/v1/object/avatars/${id}/avatar.webp`, { method: 'DELETE', headers }).catch(() => {});
        const r = await fetchImpl(`${URL_}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers });
        if (!r.ok) throw new Error(`status ${r.status}`);
        deleted++;
      } catch (e) { log(`An account deletion failed (${(e && e.message) || 'error'}); it will be tried again.`); }
    }
  } catch (e) { log(`Account deletions skipped: ${(e && e.message) || 'error'}`); }
  if (deleted) log(`Deleted ${deleted} account(s).`);
  if (MODE === 'off') { log('Email sending is switched off (EMAIL_MODE=off).'); return { sent: 0, failed: 0, skipped: true }; }

  if (MODE !== 'live' && !TEST_TO.length) { log('Test mode with no test addresses: nothing sent.'); return { sent: 0, failed: 0, skipped: true }; }
  let rows = await rpc('email_claim', { p_limit: BATCH });
  if (MODE !== 'live') {
    // Test mode: put back anything not addressed to a test address, untouched.
    const keep = rows.filter(r => TEST_TO.includes(String(r.to_email).toLowerCase()));
    for (const r of rows.filter(r => !keep.includes(r))) await rpc('email_release', { p_id: r.id });
    if (rows.length !== keep.length) log(`Test mode: ${rows.length - keep.length} email(s) left waiting for live mode.`);
    rows = keep;
  }
  if (!rows.length) { log('No emails waiting.'); return { sent: 0, failed: 0 }; }

  const mailer = transport || nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  });
  let sent = 0, failed = 0;
  for (const row of rows) {
    try {
      const m = render(row.template, row.lang, row.data);
      await mailer.sendMail({
        from: { name: 'Obsidian Cup', address: GMAIL_USER },
        to: row.to_email, subject: m.subject, html: m.html, text: m.text,
      });
      await rpc('email_done', { p_id: row.id, p_ok: true });
      sent++;
    } catch (e) {
      failed++;
      await rpc('email_done', { p_id: row.id, p_ok: false, p_error: String(e && e.message || e) }).catch(() => {});
      log(`Email ${row.id} (${row.template}) failed: ${(e && e.code) || 'error'}`);
    }
  }
  log(`Sent ${sent}, failed ${failed}.`);
  return { sent, failed };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((r) => { if (r.failed && !r.sent) process.exitCode = 1; })
       .catch((e) => { console.log(`Email sender stopped: ${e.message}`); process.exitCode = 1; });
}
