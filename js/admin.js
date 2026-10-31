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
    const { data: isAdmin } = await db.rpc('is_admin');
    if (!isAdmin) { $('#admMsg').innerHTML = `<p class="acct-msg acct-msg-error">${ocEscape(t('adminNoAccess'))}</p>`; return; }
    $('#admMsg').innerHTML = '';
    $('#admApp').hidden = false;
    $('#admSearch').addEventListener('input', render);
    $('#admExport').addEventListener('click', exportCsv);
    document.addEventListener('oc:language', render);
    await load();
  });

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
