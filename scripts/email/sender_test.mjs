// Tests the email sender and the account-deletion step with a pretend Supabase and mailer.
// Run from scripts/email after `npm ci`:   node sender_test.mjs
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
process.env.GMAIL_USER = 'sender@example.com';
process.env.GMAIL_APP_PASSWORD = 'x';
process.env.EMAIL_MODE = 'test';
process.env.EMAIL_TEST_TO = 'tester@example.com';
const { run } = await import('./send-emails.mjs');
const { render } = await import('./templates.mjs');

let pass = 0, fail = 0;
const ok = (c, name) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  FAIL ') + name); };

function world({ due = [], finish = {}, authStatus = {}, queue = [] }) {
  const calls = [], sentMail = [], released = [], done = [];
  const fetchImpl = async (url, opt = {}) => {
    const path = url.replace('https://example.supabase.co', '');
    calls.push(`${opt.method || 'GET'} ${path}`);
    const body = opt.body ? JSON.parse(opt.body) : {};
    const json = (v, status = 200) => ({ ok: status < 400, status, json: async () => v });
    if (path === '/rest/v1/rpc/due_account_deletions') return json(due);
    if (path === '/rest/v1/rpc/finish_account_deletion') return json(finish[body.p_user] !== false);
    if (path.startsWith('/storage/v1/object/avatars/')) return json({}, 200);
    if (path.startsWith('/auth/v1/admin/users/')) return json({}, authStatus[path.split('/').pop()] || 200);
    if (path === '/rest/v1/rpc/email_claim') return json(queue);
    if (path === '/rest/v1/rpc/email_release') { released.push(body.p_id); return json(null, 204); }
    if (path === '/rest/v1/rpc/email_done') { done.push(body); return json(null, 204); }
    return json({}, 404);
  };
  const transport = { sendMail: async (m) => { if (/fail/.test(m.to)) throw Object.assign(new Error('no'), { code: 'EENVELOPE' }); sentMail.push(m); } };
  const logs = [];
  return { fetchImpl, transport, log: (l) => logs.push(l), calls, sentMail, released, done, logs };
}

console.log('Account deletions');
let w = world({ due: ['a1', 'a2', 'a3'], finish: { a2: false }, authStatus: { a3: 500 } });
let r = await run(w);
ok(w.calls.includes('DELETE /auth/v1/admin/users/a1'), 'a due account has its login deleted');
ok(w.calls.includes('DELETE /storage/v1/object/avatars/a1/avatar.webp'), 'its photo is removed first');
ok(!w.calls.includes('DELETE /auth/v1/admin/users/a2'), 'an account the database says is not due is left alone');
ok(w.logs.some(l => /Deleted 1 account/.test(l)), 'only the successful deletion is counted');
ok(w.logs.some(l => /deletion failed/.test(l)) && !w.logs.join(' ').includes('a3'), 'a failed deletion is logged without the account id');
ok(w.calls.indexOf('POST /rest/v1/rpc/email_claim') > w.calls.indexOf('DELETE /auth/v1/admin/users/a1'), 'goodbye emails queued by deletions go out in the same run');

console.log('Sending');
w = world({ queue: [
  { id: 1, to_email: 'tester@example.com', template: 'welcome', lang: 'en', data: { name: 'Rina Akter', player_code: 'OC-RA427' } },
  { id: 2, to_email: 'player@example.com', template: 'welcome', lang: 'en', data: { name: 'X' } },
  { id: 3, to_email: 'tester@example.com', template: 'no_such_template', lang: 'en', data: {} },
] });
r = await run(w);
ok(r.sent === 1 && w.sentMail[0].to === 'tester@example.com', 'test mode sends only to test addresses');
ok(w.released.length === 1 && w.released[0] === 2, 'other emails are put back untouched');
ok(r.failed === 1 && w.done.some(d => d.p_id === 3 && d.p_ok === false), 'an unknown template is marked failed, the run continues');
ok(!w.logs.join(' ').includes('@'), 'logs contain no email addresses');

console.log('Templates');
for (const name of ['welcome', 'deletion_requested', 'deletion_cancelled', 'account_deleted']) {
  for (const lang of ['en', 'bn']) {
    const m = render(name, lang, { name: 'Rina <b>Akter</b>', player_code: 'OC-RA427', delete_on: '27 November 2026' });
    ok(m.subject && m.html.includes('<') && m.text.length > 20 && !/undefined|\[object/.test(m.html + m.text) && !m.html.includes('<b>Akter'), `${name} (${lang}) renders safely`);
  }
}

console.log('Addresses');
{
  const { plainAddress } = await import('./send-emails.mjs');
  ok(plainAddress('rina.akter+cup@example.com') && plainAddress('a@sub.example.co.uk'), 'ordinary addresses are accepted');
  for (const bad of ['a@example.com, b@evil.test', 'Rina <a@example.com>', '"a@evil.test"@example.com', 'a@example.com\nBcc: b@evil.test',
    'a(comment)@example.com', 'a@example', 'a@@example.com', ' a@example.com', '', null, 'a@example.com;b@evil.test']) {
    ok(!plainAddress(bad), `refused: ${JSON.stringify(bad)}`);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
