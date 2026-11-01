// Emails sent from the queue. English for now; Bangla versions are added
// here when the organiser provides them (lang 'bn'), falling back to English.
const SITE = 'https://obsidiancup.vercel.app';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function frame(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f4f2ee;">
<div style="margin:0;padding:32px 16px;background:#f4f2ee;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e0d8;">
    <div style="background:#0b1012;padding:28px 24px;text-align:center;">
      <img src="${SITE}/assets/email-logo.png" width="84" height="60" alt="Obsidian Cup" style="display:block;margin:0 auto 12px;" />
      <div style="color:#eeeae3;font-size:18px;font-weight:bold;letter-spacing:1px;">OBSIDIAN CUP</div>
    </div>
    <div style="padding:32px 28px;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#0b1012;">${esc(title)}</h1>
      ${bodyHtml}
    </div>
    <div style="padding:18px 28px;border-top:1px solid #eee;font-size:12px;line-height:1.6;color:#777;">
      Obsidian Cup, Bangladesh. <a href="https://www.instagram.com/obsidian.volleyball/" style="color:#777;">@obsidian.volleyball</a> · <a href="https://www.instagram.com/obsidian.futsal/" style="color:#777;">@obsidian.futsal</a><br />
      Questions? Reply to this email or write to obsidiancup.official@gmail.com
    </div>
  </div>
</div></body></html>`;
}
const p = (t) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">${t}</p>`;
const code = (c) => `<p style="margin:8px 0 24px;text-align:center;"><span style="display:inline-block;font-family:'Courier New',monospace;font-size:28px;letter-spacing:4px;padding:12px 20px;border-radius:6px;background:#0b1012;color:#eeeae3;">${esc(c)}</span></p>`;
const button = (href, label) => `<p style="margin:0 0 24px;text-align:center;"><a href="${href}" style="display:inline-block;background:#0b1012;color:#eeeae3;text-decoration:none;padding:14px 28px;border-radius:6px;font-size:15px;font-weight:bold;">${esc(label)}</a></p>`;

export const TEMPLATES = {
  welcome: {
    en: (d) => {
      const name = String(d.name || '').split(/\s+/)[0] || 'there';
      return {
        subject: `Your Obsidian Cup player code: ${d.player_code}`,
        html: frame(`Welcome, ${name}`,
          p('Your Obsidian Cup player account is ready. This is your player code. It stays with you for every season, on team lists, at check-in and on certificates.')
          + code(d.player_code)
          + p('You can log in with this code or your email. Next, finish your profile so you are ready when registration opens.')
          + button(`${SITE}/pages/account.html`, 'Open my account')),
        text: `Welcome, ${name}.\n\nYour Obsidian Cup player code is ${d.player_code}. It stays with you for every season.\nYou can log in with this code or your email: ${SITE}/pages/account.html\n`,
      };
    },
  },
  code_changed: {
    en: (d) => ({
      subject: `Your new Obsidian Cup player code: ${d.player_code}`,
      html: frame('Your player code changed',
        p(`Your player code is now:`) + code(d.player_code)
        + p(`Your old code ${esc(d.old_code)} no longer works for logging in. If you did not make this change, write to us straight away.`)
        + button(`${SITE}/pages/account.html`, 'Open my account')),
      text: `Your Obsidian Cup player code is now ${d.player_code}. Your old code ${d.old_code} no longer works. If you did not do this, email obsidiancup.official@gmail.com.\n`,
    }),
  },
};

export function render(template, lang, data) {
  const t = TEMPLATES[template];
  if (!t) throw new Error(`unknown_template:${template}`);
  return (t[lang] || t.en)(data || {});
}
