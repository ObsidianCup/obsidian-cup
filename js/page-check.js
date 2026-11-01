// Gate check (pages/check.html): an organiser scans a player's QR and sees who
// it belongs to. The database answers only organisers who passed two-step
// login (check_player, migration 010); for anyone else this page shows nothing.
(function () {
  const $ = s => document.querySelector(s);
  const box = $('#checkMsg');
  const say = (text, kind, link) => {
    box.innerHTML = `<p class="acct-msg acct-msg-${kind || 'info'}">${ocEscape(text)}</p>` +
      (link ? `<p style="margin-top:1rem;"><a class="acct-btn acct-btn-small" href="${link.href}">${ocEscape(link.text)}</a></p>` : '');
  };

  const m = /(?:^|[#&])t=([0-9a-f-]{36})(?:&|$)/i.exec(location.hash);
  const token = m ? m[1].toLowerCase() : null;
  // Keep the token out of the address bar history once it has been read.
  if (token && history.replaceState) history.replaceState(null, '', location.pathname);

  document.addEventListener('DOMContentLoaded', run);
  document.addEventListener('oc:language', () => { if (last) render(last); });
  let db, last = null, imgUrl = null;

  async function run() {
    ocApplyText();
    if (!token) { say(t('checkNoCode'), 'error'); return; }
    db = ocClient();
    if (!db) { say(t('notConfigured'), 'error'); return; }
    const { data: { session } } = await db.auth.getSession();
    const login = { href: 'admin.html', text: t('checkLoginBtn') };
    if (!session) { say(t('checkLoginFirst'), 'info', login); return; }
    const aal = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aal.data || aal.data.currentLevel !== 'aal2') { say(t('checkLoginFirst'), 'info', login); return; }

    const { data, error } = await db.rpc('check_player', { token });
    if (error) { say(/organisers_only/.test(error.message) ? t('adminNoAccess') : t('genericError'), 'error'); return; }
    if (!data || !data.length) { say(t('checkNotFound'), 'error'); return; }
    last = data[0];
    box.innerHTML = '';
    render(last);
    loadPhoto(last);
  }

  function render(p) {
    $('#gName').textContent = p.name || '—';
    $('#gLegal').hidden = !p.legal_name || p.legal_name === p.name;
    $('#gLegal').textContent = t('checkLegalName', { name: p.legal_name || '' });
    $('#gCode').textContent = p.player_code || '';
    const g = { male: 'genderMale', female: 'genderFemale', other: 'genderOther' }[p.gender];
    $('#gAge').textContent = [p.age != null ? t('checkAge', { n: p.age }) : null, g ? t(g) : null].filter(Boolean).join(' · ');
    $('#gInitials').textContent = (p.name || '').trim().split(/\s+/).slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('');

    const items = [[p.verified ? 'ok' : 'warn', p.verified ? 'checkIdOk' : 'checkIdNo']];
    if (p.under_18) items.push([p.guardian_ok ? 'ok' : 'warn', p.guardian_ok ? 'checkGuardianOk' : 'checkGuardianNo']);
    $('#gStatus').innerHTML = items.map(([k, key]) =>
      `<li class="is-${k}"><span aria-hidden="true">${k === 'ok' ? '✓' : '!'}</span>${ocEscape(t(key))}</li>`).join('');

    const teams = Array.isArray(p.teams) ? p.teams : [];
    $('#gTeams').innerHTML = teams.length
      ? `<p class="acct-gate-sub">${ocEscape(t('checkTeams'))}</p><ul class="acct-gate-teams">` + teams.map(x =>
          `<li><strong>${ocEscape(x.team)}</strong><span>${ocEscape(x.event)} · ${ocEscape(x.category)}${x.jersey != null ? ' · #' + ocEscape(String(x.jersey)) : ''}</span>` +
          (x.status === 'approved' ? '' : `<span class="acct-tag">${ocEscape(t('checkPending'))}</span>`) + `</li>`).join('') + '</ul>'
      : `<p class="acct-muted">${ocEscape(t('checkNoTeam'))}</p>`;
    $('#gateCard').hidden = false;
  }

  async function loadPhoto(p) {
    if (!p.avatar_version) return;
    const { data } = await db.storage.from('avatars').download(p.player_id + '/avatar.webp');
    if (!data) return;
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    imgUrl = URL.createObjectURL(data);
    $('#gImg').src = imgUrl;
    $('#gImg').hidden = false;
  }
})();
