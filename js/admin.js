/* ============================================
   OBSIDIAN CUP — Organiser page: player list
   The database only returns other players' data to admins
   (see public.is_admin in supabase/migrations/001_foundation.sql).
   ============================================ */
(function () {
  const $ = (s) => document.querySelector(s);
  let db, players = [];

  document.addEventListener('DOMContentLoaded', async () => {
    ocApplyText();
    db = ocClient();
    if (!db) { $('#admMsg').innerHTML = `<p class="acct-msg acct-msg-info">${ocEscape(t('notConfigured'))}</p>`; return; }
    const { data: { session } } = await db.auth.getSession();
    if (!session) {
      $('#admMsg').innerHTML = `<p class="acct-msg acct-msg-info">${ocEscape(t('adminLoginFirst'))} <a href="account.html">${ocEscape(t('btnLogin'))}</a></p>`;
      return;
    }
    const { data: adminEmail } = await db.rpc('is_admin_email');
    if (!adminEmail) { $('#admMsg').innerHTML = `<p class="acct-msg acct-msg-error">${ocEscape(t('adminNoAccess'))}</p>`; return; }
    $('#admMsg').innerHTML = '';
    // Admin powers need the two-step code (checked by the database, see 006).
    if (!(await twoStep())) return;
    const { data: isAdmin } = await db.rpc('is_admin');
    if (!isAdmin) { $('#admMsg').innerHTML = `<p class="acct-msg acct-msg-error">${ocEscape(t('adminNoAccess'))}</p>`; return; }
    $('#admApp').hidden = false;
    $('#admBackup').addEventListener('click', backup);
    $('#admSearch').addEventListener('input', render);
    $('#admExport').addEventListener('click', exportCsv);
    document.addEventListener('oc:language', render);
    await load();
  });

  // Resolves true once this login has passed the second step.
  async function twoStep() {
    const { data: lvl } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (lvl && lvl.currentLevel === 'aal2') return true;
    const { data: f } = await db.auth.mfa.listFactors();
    const all = (f && f.all) || [];
    let factor = ((f && f.totp) || []).find(x => x.status === 'verified');
    $('#admMfa').hidden = false;
    if (factor) {
      $('#mfaTitle').textContent = t('mfaCheckTitle');
      $('#mfaIntro').textContent = t('mfaCheckIntro');
    } else {
      // Remove half-finished set-ups, then start a fresh one.
      for (const x of all.filter(x => x.status !== 'verified')) await db.auth.mfa.unenroll({ factorId: x.id });
      const { data: en, error } = await db.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Obsidian Cup organiser' });
      if (error) { $('#admMsg').innerHTML = `<p class="acct-msg acct-msg-error">${ocEscape(t('genericError'))}</p>`; $('#admMfa').hidden = true; return false; }
      factor = { id: en.id };
      $('#mfaTitle').textContent = t('mfaSetupTitle');
      $('#mfaIntro').textContent = t('mfaSetupIntro');
      $('#mfaQr').src = en.totp.qr_code;
      $('#mfaSecret').textContent = en.totp.secret;
      $('#mfaSetup').hidden = false;
    }
    $('#mfaCode').focus();
    return new Promise(resolve => {
      $('#mfaForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = $('#mfaCode').value.replace(/\D/g, '');
        if (code.length !== 6) { $('#mfaMsg').innerHTML = `<p class="acct-msg acct-msg-error">${ocEscape(t('mfaWrong'))}</p>`; return; }
        const { error } = await db.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
        if (error) { $('#mfaMsg').innerHTML = `<p class="acct-msg acct-msg-error">${ocEscape(t('mfaWrong'))}</p>`; return; }
        $('#admMfa').hidden = true;
        resolve(true);
      });
    });
  }

  // Everything the organiser can read, as one file for the Google Drive.
  async function backup() {
    const btn = $('#admBackup'); btn.disabled = true;
    try {
      const all = async (table) => {
        const rows = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await db.from(table).select('*').range(from, from + 999);
          if (error) throw error;
          rows.push(...data);
          if (data.length < 1000) return rows;
        }
      };
      const out = {
        made_at: new Date().toISOString(),
        profiles: await all('profiles'),
        consent_records: await all('consent_records'),
        email_queue: await all('email_queue'),
      };
      const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `obsidian-cup-backup-${out.made_at.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      $('#admMsg').innerHTML = `<p class="acct-msg acct-msg-ok">${ocEscape(t('adminBackupNote'))}</p>`;
    } catch (e) {
      $('#admMsg').innerHTML = `<p class="acct-msg acct-msg-error">${ocEscape(t('genericError'))}</p>`;
    } finally { btn.disabled = false; }
  }

  async function load() {
    const { data, error } = await db.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { $('#admMsg').innerHTML = `<p class="acct-msg acct-msg-error">${ocEscape(t('genericError'))}</p>`; return; }
    players = data || [];
    render();
  }

  function filtered() {
    const q = $('#admSearch').value.trim().toLowerCase();
    if (!q) return players;
    return players.filter(p => [p.player_code, p.legal_name, p.display_name, p.email, p.phone]
      .some(v => (v || '').toLowerCase().includes(q)));
  }

  function render() {
    const list = filtered();
    $('#admCount').textContent = t('adminCount', { n: list.length });
    if (!list.length) { $('#admRows').innerHTML = `<tr><td colspan="8">${ocEscape(t('adminEmpty'))}</td></tr>`; return; }
    $('#admRows').innerHTML = list.map(p => `
      <tr>
        <td><code>${ocEscape(p.player_code || '—')}</code></td>
        <td>${ocEscape(p.legal_name || '—')}${p.display_name ? `<br><span class="acct-hint">${ocEscape(p.display_name)}</span>` : ''}</td>
        <td>${ocEscape(p.email || '')}</td>
        <td>${ocAge(p.date_of_birth) ?? '—'}</td>
        <td>${ocEscape(p.gender ? t('gender' + p.gender[0].toUpperCase() + p.gender.slice(1)) : '—')}</td>
        <td>${ocEscape(p.phone || '—')}</td>
        <td>${new Date(p.created_at).toLocaleDateString()}</td>
        <td>${p.verified_at
          ? `${ocEscape(t('adminVerified'))} <button class="acct-link" data-verify="${p.id}" data-on="0">${ocEscape(t('adminUnverify'))}</button>`
          : `<button class="acct-btn acct-btn-ghost acct-btn-small" data-verify="${p.id}" data-on="1">${ocEscape(t('adminVerify'))}</button>`}</td>
      </tr>`).join('');
    document.querySelectorAll('[data-verify]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      const { error } = await db.rpc('admin_set_verified', { p_player: b.dataset.verify, p_verified: b.dataset.on === '1' });
      if (error) { alert(t('genericError')); b.disabled = false; return; }
      await load();
    }));
  }

  function exportCsv() {
    const cols = ['player_code', 'legal_name', 'display_name', 'email', 'date_of_birth', 'gender', 'phone', 'school_club', 'instagram',
                  'emergency_name', 'emergency_relationship', 'emergency_phone', 'language', 'media_feature', 'verified_at', 'created_at'];
    const cell = v => {
      let s = v == null ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
      if (/^[=+\-@]/.test(s)) s = "'" + s;          // stop spreadsheet formula injection
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const lines = [cols.join(',')].concat(filtered().map(p => cols.map(c => cell(p[c])).join(',')));
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `obsidian-cup-players-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
})();
