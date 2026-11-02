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
    document.addEventListener('oc:language', () => { render(); showColour(); showLive(); });
    $('#admLiveBtn').addEventListener('click', toggleLive);
    await loadLive();
    $('#admLookClose').addEventListener('click', () => { $('#admLook').hidden = true; });
    showColour();
    setInterval(showColour, 60000);
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
    if (!list.length) { $('#admRows').innerHTML = `<tr><td colspan="10">${ocEscape(t('adminEmpty'))}</td></tr>`; return; }
    const lvl = p => `<select class="acct-select adm-level" data-level="${p.id}" aria-label="${ocEscape(t('adminLevel'))}">` +
      ['', 'new', 'amateur', 'club', 'league', 'national'].map(v =>
        `<option value="${v}" ${(p.playing_level || '') === v ? 'selected' : ''}>${ocEscape(v ? t(LEVEL_KEYS[v]) : t('levelNotSet'))}</option>`).join('') + '</select>';
    $('#admRows').innerHTML = list.map(p => `
      <tr>
        <td><code>${ocEscape(p.player_code || '—')}</code></td>
        <td>${ocEscape(p.legal_name || '—')}${p.display_name ? `<br><span class="acct-hint">${ocEscape(p.display_name)}</span>` : ''}</td>
        <td>${ocEscape(p.email || '')}</td>
        <td>${ocAge(p.date_of_birth) ?? '—'}</td>
        <td>${ocEscape(p.gender ? t('gender' + p.gender[0].toUpperCase() + p.gender.slice(1)) : '—')}</td>
        <td>${ocEscape(p.phone || '—')}</td>
        <td>${new Date(p.created_at).toLocaleDateString()}</td>
        <td>${lvl(p)}</td>
        <td>${p.verified_at
          ? `${ocEscape(t('adminVerified'))} <button class="acct-link" data-verify="${p.id}" data-on="0">${ocEscape(t('adminUnverify'))}</button>`
          : `<button class="acct-btn acct-btn-ghost acct-btn-small" data-verify="${p.id}" data-on="1">${ocEscape(t('adminVerify'))}</button>`}</td>
        <td><button class="acct-btn acct-btn-ghost acct-btn-small" data-look="${p.id}">${ocEscape(t('adminLookup'))}</button></td>
      </tr>`).join('');
    document.querySelectorAll('[data-level]').forEach(sel => sel.addEventListener('change', async () => {
      sel.disabled = true;
      const { error } = await db.rpc('admin_set_level', { p_player: sel.dataset.level, p_level: sel.value });
      sel.disabled = false;
      if (error) { alert(ocErrorMessage(error)); await load(); return; }
      const pl = players.find(x => x.id === sel.dataset.level); if (pl) pl.playing_level = sel.value || null;
    }));
    document.querySelectorAll('[data-look]').forEach(b => b.addEventListener('click', () => lookUp(b.dataset.look)));
    document.querySelectorAll('[data-verify]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      const { error } = await db.rpc('admin_set_verified', { p_player: b.dataset.verify, p_verified: b.dataset.on === '1' });
      if (error) { alert(t('genericError')); b.disabled = false; return; }
      await load();
    }));
  }

  const LEVEL_KEYS = { new: 'levelNew', amateur: 'levelAmateur', club: 'levelClub', league: 'levelLeague', national: 'levelNational' };

  // Live-card switch: on for event days, off the rest of the time.
  let liveOn = false;
  async function loadLive() {
    const { data } = await db.from('site_settings').select('on_off').eq('key', 'live_card').maybeSingle();
    liveOn = !!(data && data.on_off);
    showLive();
  }
  function showLive() {
    $('#admLiveState').textContent = t(liveOn ? 'adminLiveOn' : 'adminLiveOff');
    $('#admLiveState').className = 'acct-badge ' + (liveOn ? 'is-ok' : 'is-wait');
    $('#admLiveWhat').textContent = t(liveOn ? 'adminLiveOnWhat' : 'adminLiveOffWhat');
    $('#admLiveBtn').textContent = t(liveOn ? 'adminLiveTurnOff' : 'adminLiveTurnOn');
    $('#admLiveBtn').setAttribute('aria-pressed', String(liveOn));
    $('#admLiveBtn').className = 'acct-btn acct-btn-small' + (liveOn ? ' acct-btn-ghost' : '');
    $('#admColour').hidden = !liveOn;
  }
  async function toggleLive() {
    const btn = $('#admLiveBtn');
    btn.disabled = true;
    const { error } = await db.rpc('admin_set_switch', { p_key: 'live_card', p_on: !liveOn });
    btn.disabled = false;
    if (error) { $('#admLiveMsg').innerHTML = `<p class="acct-msg acct-msg-error">${ocEscape(ocErrorMessage(error))}</p>`; return; }
    $('#admLiveMsg').innerHTML = '';
    liveOn = !liveOn;
    showLive();
  }

  function showColour() {
    const c = ocCardColour();
    $('#admSwatch').style.background = c.hex;
    $('#admColourText').textContent = t('adminTodayColour', { colour: c.name });
  }

  // Quick check of one player: photo, name on ID, date of birth, age, ID status, team.
  let lookUrl = null;
  async function lookUp(id) {
    const p = players.find(x => x.id === id);
    if (!p) return;
    const box = $('#admLookBody');
    const age = ocAge(p.date_of_birth);
    const dob = p.date_of_birth ? new Date(p.date_of_birth + 'T00:00:00').toLocaleDateString(ocLang() === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
    const initials = (p.display_name || p.legal_name || '').trim().split(/\s+/).slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('');
    box.innerHTML = `
      <div class="acct-pc-id">
        <div class="acct-pc-photo adm-look-photo"><span>${ocEscape(initials)}</span><img id="admLookImg" alt="" hidden /></div>
        <div class="acct-pc-who">
          <p class="acct-pc-name">${ocEscape(p.display_name || p.legal_name || '—')}</p>
          <p class="acct-muted">${ocEscape(t('checkLegalName', { name: p.legal_name || '—' }))}</p>
          <p class="acct-pc-code">${ocEscape(p.player_code || '')}</p>
        </div>
      </div>
      <dl class="acct-pc-facts">
        <div><dt>${ocEscape(t('cardDob'))}</dt><dd>${ocEscape(dob)}${age != null ? ' · ' + ocEscape(t('checkAge', { n: age })) : ''}</dd></div>
        <div><dt>${ocEscape(t('colStatus'))}</dt><dd><span class="acct-badge ${p.verified_at ? 'is-ok' : 'is-wait'}">${ocEscape(t(p.verified_at ? 'cardIdOk' : 'cardIdNo'))}</span></dd></div>
        ${age != null && age < 18 ? `<div><dt>${ocEscape(t('laterGuardian'))}</dt><dd><span class="acct-badge ${p.guardian_consent_at ? 'is-ok' : 'is-wait'}">${ocEscape(t(p.guardian_consent_at ? 'checkGuardianOk' : 'checkGuardianNo'))}</span></dd></div>` : ''}
      </dl>
      <div class="acct-pc-now"><p class="acct-pc-sub">${ocEscape(t('cardNow'))}</p><div id="admLookTeams"><p class="acct-muted">${ocEscape(t('loading'))}</p></div></div>`;
    $('#admLook').hidden = false;
    $('#admLook').scrollIntoView({ block: 'start', behavior: 'auto' });
    const { data: teams } = await db.rpc('admin_player_teams', { p_player: id });
    const list = teams || [];
    $('#admLookTeams').innerHTML = list.length
      ? '<ul class="acct-pc-teams">' + list.map(x => `<li><strong>${ocEscape(x.team)}</strong><span>${ocEscape(x.event)} · ${ocEscape(x.category)}${x.jersey != null ? ' · #' + ocEscape(String(x.jersey)) : ''}</span>${x.status === 'approved' ? '' : `<span class="acct-tag">${ocEscape(t('cardWaiting'))}</span>`}</li>`).join('') + '</ul>'
      : `<p class="acct-muted">${ocEscape(t('cardNoTournament'))}</p>`;
    if (p.avatar_version) {
      const { data } = await db.storage.from('avatars').download(p.id + '/avatar.webp');
      if (data) { if (lookUrl) URL.revokeObjectURL(lookUrl); lookUrl = URL.createObjectURL(data); const img = $('#admLookImg'); img.src = lookUrl; img.hidden = false; }
    }
  }

  function exportCsv() {
    const cols = ['player_code', 'legal_name', 'display_name', 'email', 'date_of_birth', 'gender', 'phone', 'school_club', 'instagram',
                  'emergency_name', 'emergency_relationship', 'emergency_phone', 'language', 'media_feature', 'sports', 'playing_level', 'verified_at', 'created_at'];
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
