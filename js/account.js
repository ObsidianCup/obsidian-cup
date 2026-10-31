/* ============================================
   OBSIDIAN CUP — Player account page
   Log in / sign up, consent step, autosaving profile, player code.
   All permissions are enforced by the database (see supabase/migrations).
   ============================================ */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const PAGE = location.origin + location.pathname;          // .../pages/account.html
  const LEGAL_LANG = 'en';   // documents players agree to; becomes 'bn' when a Bangla version is published

  let db, user = null, profile = null, consents = {}, authMode = 'login', recovering = false;

  // ---------- Views ----------
  function show(view) {
    $$('[data-view]').forEach(el => { el.hidden = el.dataset.view !== view; });
    window.scrollTo(0, 0);
  }
  function msg(boxId, text, kind) {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.innerHTML = text ? `<p class="acct-msg acct-msg-${kind || 'info'}">${ocEscape(text)}</p>` : '';
  }

  // ---------- Start ----------
  document.addEventListener('DOMContentLoaded', async () => {
    ocApplyText();
    db = ocClient();
    if (!db) { show('off'); return; }
    if (SITE_CONFIG.googleLogin) { $('#googleBtn').hidden = false; $('#googleOr').hidden = false; }
    wireAuth();
    wireConsent();
    wireProfile();
    $$('[data-action="signout"]').forEach(b => b.addEventListener('click', async () => { await db.auth.signOut(); }));
    $$('[data-go]').forEach(b => b.addEventListener('click', () => { msg('authMsg', ''); show(b.dataset.go); }));
    document.addEventListener('oc:language', () => { renderConsentTexts(); if (profile) renderHome(); renderPositions(); setAuthMode(authMode); });

    db.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { recovering = true; show('newpass'); return; }
      user = session ? session.user : null;
      if (recovering) return;
      // Run outside the auth callback so database calls are not blocked.
      setTimeout(route, 0);
    });
  });

  async function route() {
    if (!user) { profile = null; setAuthMode(authMode); show('auth'); return; }
    show('loading');
    const ok = await loadEverything();
    if (!ok) { show('auth'); msg('authMsg', t('genericError'), 'error'); return; }
    const missing = OC_SIGNUP_REQUIRED.filter(k => !(consents[k] && consents[k].choice === 'accepted' && consents[k].doc_version === OC_LEGAL[k]));
    if (missing.length) { renderConsentTexts(); show('consent'); return; }
    fillForm();
    renderHome();
    show('app');
  }

  async function loadEverything() {
    let tries = 0;
    while (tries < 3) {
      const { data, error } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) return false;
      if (data) { profile = data; break; }
      tries++;                                   // profile is created by a database trigger; wait a moment
      await new Promise(r => setTimeout(r, 700));
    }
    if (!profile) return false;
    const { data: c, error: ce } = await db.from('my_consents').select('*');
    if (ce) return false;
    consents = {};
    (c || []).forEach(r => { consents[r.doc_key] = r; });
    return true;
  }

  // ---------- Log in / sign up ----------
  function setAuthMode(mode) {
    authMode = mode;
    $$('.acct-tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === mode)));
    const signup = mode === 'signup';
    $('#authTitle').textContent = t(signup ? 'authTitleSignup' : 'authTitleLogin');
    $('#authSubmit').textContent = t(signup ? 'btnSignup' : 'btnLogin');
    $('#authPassword').autocomplete = signup ? 'new-password' : 'current-password';
    $('#passwordHint').hidden = !signup;
    $('#forgotBtn').parentElement.hidden = signup;
  }

  function wireAuth() {
    $$('.acct-tab').forEach(b => b.addEventListener('click', () => { msg('authMsg', ''); setAuthMode(b.dataset.tab); }));
    $('#forgotBtn').addEventListener('click', () => { $('#forgotEmail').value = $('#authEmail').value; msg('forgotMsg', ''); show('forgot'); });

    $('#authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#authEmail').value.trim().toLowerCase();
      const password = $('#authPassword').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg('authMsg', t('errEmail'), 'error'); return; }
      if (password.length < 8) { msg('authMsg', t('errPassword'), 'error'); return; }
      const btn = $('#authSubmit'); btn.disabled = true;
      try {
        if (authMode === 'signup') {
          const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: PAGE } });
          if (error) throw error;
          if (data.session) return;              // email confirmation switched off: already logged in
          $('#checkEmailBody').textContent = t('checkEmailBody', { email });
          show('checkemail');
        } else {
          const { error } = await db.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
      } catch (err) {
        const m = (err && err.message) || '';
        msg('authMsg', /rate|too many/i.test(m) ? t('errRateLimit') : /already registered|exists/i.test(m) ? t('errExists')
          : authMode === 'login' ? t('errLogin') : t('genericError'), 'error');
      } finally { btn.disabled = false; }
    });

    $('#googleBtn').addEventListener('click', async () => {
      const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: PAGE } });
      if (error) msg('authMsg', t('genericError'), 'error');
    });

    $('#forgotForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#forgotEmail').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg('forgotMsg', t('errEmail'), 'error'); return; }
      const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: PAGE });
      // Same message either way, so nobody can test which emails have accounts.
      msg('forgotMsg', error && /rate|too many/i.test(error.message) ? t('errRateLimit') : t('resetSent'), error && /rate/i.test(error.message) ? 'error' : 'ok');
    });

    $('#newpassForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = $('#newPassword').value;
      if (password.length < 8) { msg('newpassMsg', t('errPassword'), 'error'); return; }
      const { error } = await db.auth.updateUser({ password });
      if (error) { msg('newpassMsg', ocErrorMessage(error), 'error'); return; }
      recovering = false;
      const { data } = await db.auth.getSession();
      user = data.session ? data.session.user : null;
      await route();
      showStatus(t('passwordUpdated'));
    });
  }

  // ---------- Consent ----------
  function legalLink(doc, label) {
    return `<a href="legal.html?doc=${doc}" target="_blank" rel="noopener">${ocEscape(label)}</a>`;
  }
  function renderConsentTexts() {
    $('#cTermsText').innerHTML = ocEscape(t('agreeTerms')).replace('{terms}', legalLink('terms', t('termsLink')));
    $('#cPrivacyText').innerHTML = ocEscape(t('agreePrivacy')).replace('{privacy}', legalLink('privacy', t('privacyLink')));
  }
  function wireConsent() {
    $('#consentBtn').addEventListener('click', async () => {
      if (!($('#cTerms').checked && $('#cPrivacy').checked && $('#cDob').checked)) { msg('consentMsg', t('consentNeedAll'), 'error'); return; }
      const btn = $('#consentBtn'); btn.disabled = true;
      const rows = OC_SIGNUP_REQUIRED.map(k => ({
        doc_key: k, doc_version: OC_LEGAL[k], doc_lang: LEGAL_LANG, choice: 'accepted',
        context: 'signup', user_agent: navigator.userAgent.slice(0, 400),
      }));
      const { error } = await db.from('consent_records').insert(rows);
      btn.disabled = false;
      if (error) { msg('consentMsg', t('genericError'), 'error'); return; }
      msg('consentMsg', '');
      await route();
    });
  }

  // ---------- Profile form + autosave ----------
  const TEXT_FIELDS = ['legal_name', 'display_name', 'phone', 'school_club', 'instagram', 'emergency_name', 'emergency_relationship', 'emergency_phone'];
  const CHANGE_FIELDS = ['date_of_birth', 'gender', 'language'];
  const RULES = {
    phone: v => !v || /^\+?[0-9 ()-]{7,20}$/.test(v) || t('errPhone'),
    emergency_phone: v => !v || /^\+?[0-9 ()-]{7,20}$/.test(v) || t('errPhone'),
    instagram: v => !v || /^@?[A-Za-z0-9._]{1,30}$/.test(v) || t('errInstagram'),
    date_of_birth: v => {
      if (!v) return true;
      const d = new Date(v + 'T00:00:00');
      return (d >= new Date('1940-01-01T00:00:00') && d <= new Date()) || t('errDob');
    },
  };
  let pending = {}, timer = null, saving = false;

  function fieldErr(name, text) {
    const el = $(`[data-err="${name}"]`);
    if (el) el.textContent = text || '';
    const input = document.getElementById('f_' + name);
    if (input) input.setAttribute('aria-invalid', text ? 'true' : 'false');
  }

  function queue(name, value, quick) {
    if (typeof value === 'string') { value = value.trim(); if (value === '') value = null; }
    const rule = RULES[name];
    const verdict = rule ? rule(value) : true;
    if (verdict !== true) { fieldErr(name, verdict); return; }
    fieldErr(name, '');
    pending[name] = value;
    clearTimeout(timer);
    timer = setTimeout(flush, quick ? 50 : 700);
    showStatus(t('saving'));
  }

  async function flush() {
    if (saving || !Object.keys(pending).length) return;
    const payload = pending; pending = {}; saving = true;
    const { data, error } = await db.from('profiles').update(payload).eq('id', user.id).select().single();
    saving = false;
    if (error) {
      const keys = Object.keys(payload);
      if (error.code && error.code !== 'PGRST301') {
        // A rule in the database said no: show it next to the field, do not retry.
        keys.forEach(k => fieldErr(k, ocErrorMessage(error)));
        showStatus(ocErrorMessage(error), true);
      } else {
        pending = Object.assign(payload, pending);   // connection problem: keep and retry
        showStatus(t('saveFailed'), true);
        timer = setTimeout(flush, 4000);
      }
      return;
    }
    profile = data;
    renderHome();
    if (Object.keys(pending).length) flush(); else showStatus(t('saved'));
  }

  let statusTimer = null;
  function showStatus(text, isError) {
    const el = $('#saveStatus');
    el.textContent = text;
    el.classList.toggle('is-error', !!isError);
    el.hidden = false;
    clearTimeout(statusTimer);
    if (!isError && text !== t('saving')) statusTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  window.addEventListener('beforeunload', (e) => {
    if (saving || Object.keys(pending).length) { flush(); e.preventDefault(); e.returnValue = ''; }
  });

  function wireProfile() {
    TEXT_FIELDS.forEach(name => {
      const el = document.getElementById('f_' + name);
      el.addEventListener('input', () => queue(name, el.value));
      el.addEventListener('blur', () => { if (name in pending) flush(); });
    });
    CHANGE_FIELDS.forEach(name => {
      const el = document.getElementById('f_' + name);
      el.addEventListener('change', () => queue(name, el.value, true));
    });
    $('#f_media_feature').addEventListener('change', async (e) => {
      const on = e.target.checked;
      queue('media_feature', on, true);
      await db.from('consent_records').insert({
        doc_key: 'media_feature', doc_version: OC_LEGAL.media_feature, doc_lang: LEGAL_LANG,
        choice: on ? 'accepted' : 'withdrawn', context: 'profile', user_agent: navigator.userAgent.slice(0, 400),
      });
    });
    $('#profileForm').addEventListener('submit', e => e.preventDefault());
    $('#copyCode').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(profile.player_code); $('#copyCode').textContent = t('copied'); setTimeout(() => { $('#copyCode').textContent = t('copy'); }, 1500); } catch (e) {}
    });
    renderPositions();
  }

  function renderPositions() {
    const box = $('#positions');
    const current = (profile && profile.positions) || {};
    box.innerHTML = Object.keys(OC_SPORTS).map(sport => `
      <div class="acct-sport">
        <p class="acct-sport-name">${ocEscape(t('sport_' + sport))}</p>
        <div class="acct-chips">
          ${OC_SPORTS[sport].map(pos => `
            <label class="acct-chip"><input type="checkbox" data-sport="${sport}" value="${pos}" ${(current[sport] || []).includes(pos) ? 'checked' : ''} />
            <span>${ocEscape(t('pos_' + pos))}</span></label>`).join('')}
        </div>
      </div>`).join('');
    $$('input[data-sport]', box).forEach(cb => cb.addEventListener('change', () => {
      const obj = {};
      $$('input[data-sport]:checked', box).forEach(c => { (obj[c.dataset.sport] = obj[c.dataset.sport] || []).push(c.value); });
      queue('positions', obj, true);
    }));
  }

  function fillForm() {
    TEXT_FIELDS.concat(CHANGE_FIELDS).forEach(name => {
      const el = document.getElementById('f_' + name);
      if (el) el.value = profile[name] == null ? '' : profile[name];
    });
    $('#f_language').value = profile.language || 'en';
    $('#f_media_feature').checked = !!profile.media_feature;
    const locked = !!profile.verified_at;
    $('#f_legal_name').disabled = locked;
    $('#f_date_of_birth').disabled = locked;
    $('#lockedNote').innerHTML = locked ? `<p class="acct-msg acct-msg-info">${ocEscape(t('lockedNote'))}</p>` : '';
    renderPositions();
  }

  // ---------- Home: welcome, code, checklist ----------
  function renderHome() {
    const name = profile.display_name || (profile.legal_name || '').split(/\s+/)[0];
    $('#welcomeTitle').textContent = name ? t('welcome', { name }) : t('welcomeNoName');

    $('#codeValue').textContent = profile.player_code || '—';
    $('#copyCode').hidden = !profile.player_code;
    $('#codePending').hidden = !!profile.player_code;

    const age = ocAge(profile.date_of_birth);
    const under13 = age !== null && age < 13 && !profile.guardian_consent_at;
    $('#extended').hidden = under13;
    $('#ageNote').innerHTML = under13
      ? `<p class="acct-msg acct-msg-info">${ocEscape(t('under13'))}</p>`
      : (age !== null && age < 18 ? `<p class="acct-msg acct-msg-info">${ocEscape(t('under18'))}</p>` : '');

    const basics = !!(profile.legal_name && profile.date_of_birth && profile.gender);
    const contact = !!(profile.phone && profile.emergency_name && profile.emergency_relationship && profile.emergency_phone);
    const items = [
      { key: 'checkConsent', state: 'done' },
      { key: 'checkBasics', state: basics ? 'done' : 'todo' },
      { key: 'checkContact', state: under13 ? 'soon' : (contact ? 'done' : 'todo') },
    ];
    if (age === null || age < 18) items.push({ key: 'checkGuardian', state: profile.guardian_consent_at ? 'done' : 'soon' });
    items.push({ key: 'checkId', state: 'soon' });

    const actionable = items.filter(i => i.state !== 'soon');
    const done = actionable.filter(i => i.state === 'done').length;
    $('#progressBar').style.width = Math.round(done / actionable.length * 100) + '%';
    $('#progressText').textContent = t('progress', { done, total: actionable.length });
    $('#checklist').innerHTML = items.map(i => `
      <li><span class="acct-dot ${i.state === 'done' ? 'is-done' : i.state === 'soon' ? 'is-soon' : ''}" aria-hidden="true">✓</span>
      <span>${ocEscape(t(i.key))}</span>
      <span class="acct-tag">${ocEscape(t(i.state === 'done' ? 'done' : i.state === 'soon' ? 'soon' : 'todo'))}</span></li>`).join('');
  }
})();
