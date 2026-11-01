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

  const rows = await rpc('email_claim', { p_limit: BATCH });
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
