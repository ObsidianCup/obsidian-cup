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

  // What the confirmation / reset link put in the address, read before the
  // login library tidies it away.
  const LINK = (() => {
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    const q = new URLSearchParams(location.search);
    return {
      error: h.get('error_description') || q.get('error_description') || h.get('error') || q.get('error'),
      fromEmail: !!(h.get('type') || q.get('code') || h.get('access_token')),
      recovery: h.get('type') === 'recovery' || q.get('type') === 'recovery',
    };
  })();
  let linkNoticeShown = false;
  let authNotice = null;      // shown on the log-in screen after signing out (deletion requested)
  let deleting = false;       // true while a deletion request is being made

  // ---------- Views ----------
  function show(view) {
    $$('[data-view]').forEach(el => { el.hidden = el.dataset.view !== view; });
    $('#main').classList.toggle('acct-wrap-app', view === 'app');   // player card beside the profile on wide screens
    window.scrollTo(0, 0);
  }
  const msgTimers = {};
  function msg(boxId, text, kind) {
    const box = document.getElementById(boxId);
    if (!box) return;
    clearTimeout(msgTimers[boxId]);
    box.innerHTML = text ? `<p class="acct-msg acct-msg-${kind || 'info'}">${ocEscape(text)}</p>` : '';
    // A success note goes away by itself; errors stay until fixed.
    if (text && kind === 'ok') msgTimers[boxId] = setTimeout(() => { box.innerHTML = ''; }, 3500);
  }

  // ---------- Start ----------
  document.addEventListener('DOMContentLoaded', async () => {
    ocApplyText();
    db = ocClient();
    if (!db) { show('off'); return; }
    if (SITE_CONFIG.googleLogin) { $('#googleBtn').hidden = false; $('#googleOr').hidden = false; }
    wireAuth();
    loadCaptcha();
    wireConsent();
    wireProfile();
    wireSportsPick();
    wireLevel();
    wireDelete();
    // Pick up the organiser's live-card switch when the player comes back to the page.
    document.addEventListener('visibilitychange', () => { if (!document.hidden && profile) { liveOn = null; renderLive(); } });
    $$('[data-action="signout"]').forEach(b => b.addEventListener('click', async () => { await db.auth.signOut(); }));
    $$('[data-go]').forEach(b => b.addEventListener('click', () => { msg('authMsg', ''); show(b.dataset.go); }));
    document.addEventListener('oc:language', () => { renderConsentTexts(); if (profile) { renderHome(); renderDobInfo(); fillShirtSizes(); renderMySports(); renderLevel(); } renderPositions(); setAuthMode(authMode); });

    // A reset-password link: always ask for the new password first, even if
    // the login library's "recovery" signal arrives late or not at all.
    if (LINK.recovery && !LINK.error) { recovering = true; show('loading'); }
    db.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { recovering = true; show('newpass'); return; }
      user = session ? session.user : null;
      if (recovering) {
        if (session) { show('newpass'); history.replaceState(null, '', location.pathname); }
        else if (event === 'INITIAL_SESSION') { recovering = false; setTimeout(route, 0); }
        return;
      }
      // Run outside the auth callback so database calls are not blocked.
      setTimeout(route, 0);
    });
  });

  async function route() {
    if (!user) {
      profile = null; setAuthMode(authMode); show('auth');
      if (authNotice) { msg('authMsg', authNotice, 'info'); authNotice = null; return; }
      if (!linkNoticeShown && (LINK.error || LINK.fromEmail)) {
        linkNoticeShown = true;
        msg('authMsg', LINK.error ? t('linkExpired') : t('emailConfirmed'), LINK.error ? 'error' : 'ok');
        history.replaceState(null, '', location.pathname);
      }
      return;
    }
    if (LINK.error || LINK.fromEmail) history.replaceState(null, '', location.pathname);
    show('loading');
    const ok = await loadEverything();
    if (!ok) { show('auth'); msg('authMsg', t('genericError'), 'error'); return; }
    // Logging in again within the 14 days keeps the account.
    let welcomeBack = false;
    if (profile.deletion_requested_at && !deleting) {
      const { data: kept } = await db.rpc('cancel_account_deletion');
      if (kept) { profile.deletion_requested_at = null; welcomeBack = true; }
    }
    if (deleting) return;
    const missing = OC_SIGNUP_REQUIRED.filter(k => !(consents[k] && consents[k].choice === 'accepted' && consents[k].doc_version === OC_LEGAL[k]));
    if (missing.length) { renderConsentTexts(); show('consent'); return; }
    if (!(profile.sports || []).length) { msg('sportsMsg', ''); show('sports'); return; }
    fillForm();
    renderHome();
    show('app');
    msg('appMsg', welcomeBack ? t('deleteCancelled') : '', 'info');
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

  // ---------- Delete account ----------
  // A confirmation box that names the account. Cancel has focus first; Escape,
  // Cancel or a click outside closes it and focus goes back to the button.
  function wireDelete() {
    const dlg = $('#deleteDialog'), open = $('#deleteOpen'), btn = $('#deleteConfirm');
    const word = $('#deleteWord');
    const shut = () => { if (dlg.open) dlg.close(); };
    dlg.addEventListener('close', () => { word.value = ''; msg('deleteMsg', ''); word.removeAttribute('aria-invalid'); open.focus(); });
    open.addEventListener('click', () => {
      const name = (profile && (profile.legal_name || profile.display_name)) || (user && user.email) || '';
      const code = (profile && profile.player_code) || '';
      $('#deleteDlgTitle').textContent = code ? t('deleteDlgTitle', { name, code }) : t('deleteDlgTitle', { name, code: '—' }).replace(' (—)', '');
      $('#deleteDlgWhen').textContent = t('deleteDlgWhen');
      dlg.showModal();
      $('#deleteCancel').focus();
    });
    $('#deleteCancel').addEventListener('click', shut);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) shut(); });   // the dimmed area outside the box
    // Check the word when leaving the box; clear the message as soon as it is edited.
    word.addEventListener('blur', () => {
      const v = word.value.trim();
      if (v && v !== 'DELETE') { msg('deleteMsg', t('deleteErrWord'), 'error'); word.setAttribute('aria-invalid', 'true'); }
    });
    word.addEventListener('input', () => { msg('deleteMsg', ''); word.removeAttribute('aria-invalid'); });
    $('#deleteForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (ocIsBusy(btn)) return;
      const v = word.value.trim();
      if (v !== 'DELETE') { msg('deleteMsg', t('deleteErrWord'), 'error'); word.setAttribute('aria-invalid', 'true'); word.focus(); return; }
      ocBusy(btn, true);
      const busyText = setTimeout(() => { btn.textContent = t('deleteBusy'); }, 100);   // only if it takes a moment
      const done = () => { clearTimeout(busyText); ocBusy(btn, false); btn.textContent = t('deleteConfirmBtn'); };
      deleting = true;
      const { data, error } = await db.rpc('request_account_deletion', { p_confirm: v });
      done();
      if (error) {
        deleting = false;
        const m = (error.message || '') + ' ' + (error.hint || '');
        msg('deleteMsg', /login_again/.test(m) ? t('deleteErrLogin') : /captain_of_active_team/.test(m) ? t('deleteErrCaptain')
          : /on_team_after_deadline/.test(m) ? t('deleteErrDeadline') : /confirm_word/.test(m) ? t('deleteErrWord') : ocErrorMessage(error), 'error');
        return;
      }
      const date = new Date(data).toLocaleDateString(ocLang() === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' });
      authNotice = t('deleteDone', { date });
      shut();
      await db.auth.signOut();
      deleting = false;
    });
  }

  // ---------- Log in / sign up ----------
  function setAuthMode(mode) {
    authMode = mode;
    $$('.acct-tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === mode)));
    const signup = mode === 'signup';
    $('#authTitle').textContent = t(signup ? 'authTitleSignup' : 'authTitleLogin');
    $('#authSubmit').textContent = t(signup ? 'btnSignup' : 'btnLogin');
    $('#authPassword').autocomplete = signup ? 'new-password' : 'current-password';
    $('#authEmailLabel').textContent = t(signup ? 'email' : 'emailOrCode');
    $('#authEmail').autocomplete = signup ? 'email' : 'username';
    $('#authEmail').inputMode = signup ? 'email' : 'text';
    $('#passwordHint').hidden = !signup;
    $('#password2Field').hidden = !signup;
    $('#forgotBtn').parentElement.hidden = signup;
  }

  // Show / hide buttons next to password fields.
  function wirePasswordToggles() {
    $$('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.toggle);
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.setAttribute('aria-pressed', String(!showing));
        btn.textContent = t(showing ? 'show' : 'hide');
        btn.dataset.t = showing ? 'show' : 'hide';
        input.focus();
      });
    });
  }

  // ---------- Anti-bot check (Cloudflare Turnstile) ----------
  // Only when a site key is set in config.js. Each token works once, so the
  // widget is reset after every attempt.
  const captcha = { ready: null, ids: {} };
  function loadCaptcha() {
    if (!SITE_CONFIG.turnstileSiteKey) return;
    captcha.ready = new Promise((resolve, reject) => {
      window.ocTurnstileLoaded = resolve;
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=ocTurnstileLoaded';
      s.async = true;
      // Blocked by an ad blocker or a bad connection: say so instead of waiting for ever.
      s.onerror = () => reject(new Error('captcha_unavailable'));
      setTimeout(() => reject(new Error('captcha_unavailable')), 15000);
      document.head.appendChild(s);
    }).then(() => {
      ['captchaAuth', 'captchaForgot'].forEach(id => {
        captcha.ids[id] = window.turnstile.render('#' + id, {
          sitekey: SITE_CONFIG.turnstileSiteKey, theme: 'dark', size: 'flexible',
          language: ocLang() === 'bn' ? 'bn' : 'en', 'refresh-expired': 'auto',
        });
      });
    });
    captcha.ready.catch(() => {});   // reported when the visitor submits a form
  }
  async function captchaToken(id) {
    if (!captcha.ready) return undefined;
    await captcha.ready;
    const tok = window.turnstile.getResponse(captcha.ids[id]);
    if (!tok) throw new Error('captcha_missing');
    return tok;
  }
  function captchaReset(id) { if (captcha.ids[id] !== undefined && window.turnstile) window.turnstile.reset(captcha.ids[id]); }

  // Player code + password: a small server function finds the email, so the
  // page never sees anyone's email (supabase/functions/login-with-code).
  async function loginWithCode(code, password, captchaTok) {
    const res = await fetch(SITE_CONFIG.supabaseUrl + '/functions/v1/login-with-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SITE_CONFIG.supabasePublishableKey },
      body: JSON.stringify({ code, password, captchaToken: captchaTok }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error('too many');
    if (!res.ok || !body.access_token) throw new Error('invalid');
    const { error } = await db.auth.setSession({ access_token: body.access_token, refresh_token: body.refresh_token });
    if (error) throw error;
  }

  function wireAuth() {
    wirePasswordToggles();
    $$('.acct-tab').forEach(b => b.addEventListener('click', () => { msg('authMsg', ''); setAuthMode(b.dataset.tab); }));
    $('#forgotBtn').addEventListener('click', () => { $('#forgotEmail').value = $('#authEmail').value; msg('forgotMsg', ''); show('forgot'); });

    $('#authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const raw = $('#authEmail').value.trim();
      const email = raw.toLowerCase();
      const password = $('#authPassword').value;
      const byCode = authMode === 'login' && !raw.includes('@');
      if (byCode && !/^(OC)?-?[A-Z]{1,3}[0-9]{3,6}$/i.test(raw.replace(/\s/g, ''))) { msg('authMsg', t('errEmailOrCode'), 'error'); return; }
      if (!byCode && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg('authMsg', t(authMode === 'login' ? 'errEmailOrCode' : 'errEmail'), 'error'); return; }
      if (password.length < 8) { msg('authMsg', t('errPassword'), 'error'); return; }
      if (authMode === 'signup' && password !== $('#authPassword2').value) { msg('authMsg', t('errPasswordMatch'), 'error'); return; }
      const btn = $('#authSubmit');
      if (ocIsBusy(btn)) return;
      ocBusy(btn, true);
      try {
        const captchaTok = await captchaToken('captchaAuth');
        if (authMode === 'signup') {
          const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: PAGE, captchaToken: captchaTok } });
          if (error) throw error;
          // Supabase hides whether an email is taken: an existing account comes back with no identities.
          if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            setAuthMode('login'); msg('authMsg', t('errExists'), 'error'); return;
          }
          if (data.session) return;              // email confirmation switched off: already logged in
          $('#checkEmailBody').textContent = t('checkEmailBody', { email });
          show('checkemail');
        } else if (byCode) {
          await loginWithCode(raw, password, captchaTok);
        } else {
          const { error } = await db.auth.signInWithPassword({ email, password, options: { captchaToken: captchaTok } });
          if (error) throw error;
        }
      } catch (err) {
        const m = (err && err.message) || '';
        msg('authMsg', /captcha_unavailable/.test(m) ? t('errCaptchaLoad') : /captcha/i.test(m) ? t('errCaptcha') : /rate|too many/i.test(m) ? t('errRateLimit') : /already registered|exists/i.test(m) ? t('errExists')
          : byCode ? t('errLoginCode') : authMode === 'login' ? t('errLogin') : t('genericError'), 'error');
      } finally { ocBusy(btn, false); captchaReset('captchaAuth'); }
    });

    $('#googleBtn').addEventListener('click', async () => {
      const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: PAGE } });
      if (error) msg('authMsg', t('genericError'), 'error');
    });

    $('#forgotForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = $('#forgotEmail').value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg('forgotMsg', t('errEmail'), 'error'); return; }
      let error;
      try {
        ({ error } = await db.auth.resetPasswordForEmail(email, { redirectTo: PAGE, captchaToken: await captchaToken('captchaForgot') }));
      } catch (err) { error = err; }
      captchaReset('captchaForgot');
      // Same message either way, so nobody can test which emails have accounts.
      const m = (error && error.message) || '';
      msg('forgotMsg', /captcha_unavailable/.test(m) ? t('errCaptchaLoad') : /captcha/i.test(m) ? t('errCaptcha') : /rate|too many/i.test(m) ? t('errRateLimit') : t('resetSent'),
        /captcha|rate|too many/i.test(m) ? 'error' : 'ok');
    });

    $('#newpassForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = $('#newPassword').value;
      if (password.length < 8) { msg('newpassMsg', t('errPassword'), 'error'); return; }
      if (password !== $('#newPassword2').value) { msg('newpassMsg', t('errPasswordMatch'), 'error'); return; }
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
      const btn = $('#consentBtn');
      if (ocIsBusy(btn)) return;
      ocBusy(btn, true);
      const rows = OC_SIGNUP_REQUIRED.map(k => ({
        doc_key: k, doc_version: OC_LEGAL[k], doc_lang: LEGAL_LANG, choice: 'accepted',
        context: 'signup', user_agent: navigator.userAgent.slice(0, 400),
      }));
      const { error } = await db.from('consent_records').insert(rows);
      ocBusy(btn, false);
      if (error) { msg('consentMsg', t('genericError'), 'error'); return; }
      msg('consentMsg', '');
      await route();
    });
  }

  // ---------- Profile form + autosave ----------
  const TEXT_FIELDS = ['legal_name', 'display_name', 'school_club', 'instagram', 'emergency_name', 'emergency_relationship',
    'height_cm', 'weight_kg', 'standing_reach_cm', 'vertical_jump_cm', 'playing_since', 'preferred_jersey', 'bio'];
  const PHONE_FIELDS = ['phone', 'emergency_phone'];
  const CHANGE_FIELDS = ['gender', 'language', 'dominant_hand', 'dominant_foot', 'shirt_size'];
  const range = (lo, hi, key) => v => v == null || (/^[0-9]{1,4}$/.test(String(v)) && +v >= lo && +v <= hi) || t(key);
  const RULES = {
    height_cm: range(100, 250, 'errHeight'),
    weight_kg: range(25, 200, 'errWeight'),
    standing_reach_cm: range(120, 350, 'errReach'),
    vertical_jump_cm: range(5, 150, 'errJump'),
    playing_since: v => range(1980, new Date().getFullYear(), 'errSince')(v),
    preferred_jersey: range(0, 99, 'errJersey'),
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
        if ('date_of_birth' in payload) { $('#f_date_of_birth').value = profile.date_of_birth || ''; renderDobInfo(); }
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
    renderDobInfo();
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
    // Date of birth: saved only when the player leaves the field (typing a date
    // fires many in-between "changes"), and only after they confirm.
    const dobEl = $('#f_date_of_birth');
    dobEl.addEventListener('blur', saveDob);
    dobEl.addEventListener('change', () => { if (document.activeElement !== dobEl) saveDob(); });
    $('#f_media_feature').addEventListener('change', async (e) => {
      const on = e.target.checked;
      queue('media_feature', on, true);
      await db.from('consent_records').insert({
        doc_key: 'media_feature', doc_version: OC_LEGAL.media_feature, doc_lang: LEGAL_LANG,
        choice: on ? 'accepted' : 'withdrawn', context: 'profile', user_agent: navigator.userAgent.slice(0, 400),
      });
    });
    $('#f_show_sport_stats').addEventListener('change', e => queue('show_sport_stats', e.target.checked, true));
    PHONE_FIELDS.forEach(wirePhone);
    $('#profileForm').addEventListener('submit', e => e.preventDefault());
    $('#copyCode').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(profile.player_code); $('#copyCode').textContent = t('copied'); setTimeout(() => { $('#copyCode').textContent = t('copy'); }, 1500); } catch (e) {}
    });
    wireCodePicker();
    renderPositions();
  }

  // ---------- Choosing a player code ----------
  function initialsOf(name) {
    const i = (name || '').toUpperCase().split(/\s+/).map(w => w.replace(/[^A-Z]/g, '')).filter(Boolean).map(w => w[0]).join('').slice(0, 3);
    return i || 'X';
  }
  function wireCodePicker() {
    let checkTimer = null, lastChecked = '', codeFree = '';
    const prefix = () => 'OC-' + initialsOf(profile.legal_name);
    const left = () => Math.max(0, 2 - (profile.code_changes || 0));
    const status = (text, kind) => { const el = $('#codeStatus'); el.textContent = text; el.className = 'acct-hint' + (kind ? ' is-' + kind : ''); };

    async function check() {
      const digits = $('#codeDigits').value;
      const code = prefix() + digits;
      codeFree = '';
      $$('#codeSuggestions input').forEach(r => { r.checked = r.value === code; });
      if (!/^[0-9]{3,4}$/.test(digits)) { status(digits ? t('codeFormat') : '', digits ? 'bad' : ''); return; }
      if (code === profile.player_code) { status(t('codeCurrent')); return; }
      status(t('codeChecking'));
      lastChecked = code;
      const { data, error } = await db.rpc('player_code_status', { p_code: code });
      if (lastChecked !== code) return;                 // they kept typing
      if (error) { status(t('genericError'), 'bad'); return; }
      if (data === 'ok') { status(t('codeOk', { code }), 'ok'); codeFree = code; }
      else if (data === 'limit') status(t('codeNoChangesLeft'), 'bad');
      else if (data === 'format') status(t('codeFormat'), 'bad');
      else status(t('codeTaken', { code }), 'bad');
    }

    async function open() {
      msg('codeDone', '');
      $('#codePicker').hidden = false; $('#codeChangeWrap').hidden = true;
      msg('codeMsg', '');
      $('#codePrefix').textContent = prefix();
      $('#codeDigits').value = ''; status(''); codeFree = '';
      const none = left() === 0;
      $('#codePickerIntro').textContent = none ? t('codeNoChangesLeft') : t('codeChangesLeft', { n: left() });
      ['#codeSuggestions', '#codeDigits', '#codeSave'].forEach(sel => { $(sel).closest('.acct-field, .acct-chips, button').hidden = none; });
      $('#codeSuggestions').innerHTML = '';
      if (none) return;
      const { data } = await db.rpc('suggest_player_codes');
      $('#codeSuggestions').innerHTML = (data || []).map(c => `
        <label class="acct-chip"><input type="radio" name="codeSug" value="${ocEscape(c)}"><span>${ocEscape(c)}</span></label>`).join('');
      $$('#codeSuggestions input').forEach(r => r.addEventListener('change', () => {
        $('#codeDigits').value = r.value.slice(prefix().length); check();
      }));
    }
    function close() { $('#codePicker').hidden = true; $('#codeChangeWrap').hidden = !profile.player_code; }

    $('#codeChangeBtn').addEventListener('click', open);
    $('#codeCancel').addEventListener('click', close);
    $('#codeDigits').addEventListener('input', e => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      clearTimeout(checkTimer); checkTimer = setTimeout(check, 350);
    });
    $('#codeSave').addEventListener('click', async () => {
      const code = prefix() + $('#codeDigits').value;
      const save = $('#codeSave');
      if (ocIsBusy(save)) return;
      if (code !== codeFree) { status(t('codeNeedOk'), 'bad'); $('#codeDigits').focus(); return; }
      if (!confirm(t('codeConfirm', { code, n: left() - 1 }))) return;
      ocBusy(save, true);
      const { data, error } = await db.rpc('choose_player_code', { p_code: code });
      ocBusy(save, false);
      if (error) {
        const m = error.message || '';
        msg('codeMsg', /code_taken/.test(m) ? t('codeTaken', { code }) : /code_limit/.test(m) ? t('codeNoChangesLeft') : t('genericError'), 'error');
        return;
      }
      const { data: fresh } = await db.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (fresh) profile = fresh;
      close(); renderHome();
      msg('codeDone', t('codeSaved', { code: data }), 'ok');
    });
  }

  // ---------- Phone numbers with country codes ----------
  // Saved as international numbers (e.g. +8801711000000); shown in the
  // country's own format. Bangladesh is the default country.
  const LP = window.libphonenumber;
  const DEFAULT_CC = 'BD';
  let countryOptions = null;
  function countryOptionsHtml() {
    if (countryOptions) return countryOptions;
    let names;
    try { names = new Intl.DisplayNames([ocLang() === 'bn' ? 'bn' : 'en'], { type: 'region' }); } catch (e) { names = null; }
    const list = LP.getCountries().map(cc => ({ cc, name: names ? names.of(cc) : cc, code: LP.getCountryCallingCode(cc) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const first = list.filter(c => ['BD', 'IN', 'FI'].includes(c.cc));
    const opt = c => `<option value="${c.cc}" data-full="+${c.code} ${ocEscape(c.name)}" data-short="+${c.code}">+${c.code} ${ocEscape(c.name)}</option>`;
    countryOptions = first.sort((a, b) => (a.cc === 'BD' ? -1 : b.cc === 'BD' ? 1 : 0)).map(opt).join('')
      + '<option disabled>──────────</option>' + list.map(opt).join('');
    return countryOptions;
  }
  // The closed box shows just "+880" so it fits on phones; the open list
  // shows "+880 Bangladesh" so players can find their country.
  function ccShort(sel) {
    Array.from(sel.options).forEach(o => { if (o.dataset.full) o.textContent = o.selected ? o.dataset.short : o.dataset.full; });
  }
  function ccFull(sel) {
    Array.from(sel.options).forEach(o => { if (o.dataset.full) o.textContent = o.dataset.full; });
  }
  function phoneFill(name, value) {
    const sel = document.getElementById('f_' + name + '_cc');
    const input = document.getElementById('f_' + name);
    if (!LP) { input.value = value || ''; return; }
    if (!sel.options.length) sel.innerHTML = countryOptionsHtml();
    const parsed = value ? LP.parsePhoneNumberFromString(value) : null;
    sel.value = (parsed && parsed.country) || sel.value || DEFAULT_CC;
    ccShort(sel);
    input.value = parsed ? parsed.formatNational() : (value || '');
  }
  function phoneRead(name, showErrors) {
    const sel = document.getElementById('f_' + name + '_cc');
    const input = document.getElementById('f_' + name);
    const raw = input.value.trim();
    if (!raw) return { ok: true, value: null };
    if (!LP) return /^\+?[0-9 ()-]{7,20}$/.test(raw) ? { ok: true, value: raw } : { ok: false };
    const parsed = raw.startsWith('+') || raw.startsWith('00')
      ? LP.parsePhoneNumberFromString(raw.replace(/^00/, '+'))
      : LP.parsePhoneNumberFromString(raw, sel.value);
    if (parsed && parsed.country && parsed.country !== sel.value) { sel.value = parsed.country; ccShort(sel); }   // pasted +358… picks Finland
    return parsed && parsed.isValid() ? { ok: true, value: parsed.number } : { ok: false };
  }
  function wirePhone(name) {
    const sel = document.getElementById('f_' + name + '_cc');
    const input = document.getElementById('f_' + name);
    if (LP) sel.innerHTML = countryOptionsHtml(); else sel.hidden = true;
    sel.value = DEFAULT_CC;
    ccShort(sel);
    ['mousedown', 'focus', 'keydown'].forEach(ev => sel.addEventListener(ev, () => ccFull(sel)));
    sel.addEventListener('blur', () => ccShort(sel));
    let t0 = null;
    const attempt = (final) => {
      const r = phoneRead(name);
      if (r.ok) { fieldErr(name, ''); if (r.value !== (profile && profile[name])) queue(name, r.value, final); }
      else if (final) fieldErr(name, t('errPhone'));
    };
    input.addEventListener('input', () => { clearTimeout(t0); t0 = setTimeout(() => attempt(false), 700); });
    input.addEventListener('blur', () => { clearTimeout(t0); attempt(true); });
    sel.addEventListener('change', () => { ccShort(sel); attempt(true); });
  }

  function saveDob() {
    const el = $('#f_date_of_birth');
    const value = el.value || null;
    if (!profile || value === (profile.date_of_birth || null)) return;
    if (!value) { el.value = profile.date_of_birth || ''; return; }   // cannot clear it
    const verdict = RULES.date_of_birth(value);
    if (verdict !== true) { fieldErr('date_of_birth', verdict); return; }
    const pretty = new Date(value + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
    const left = 2 - (profile.dob_changes || 0);
    if (profile.date_of_birth && left <= 0) { fieldErr('date_of_birth', t('errDobLimit')); el.value = profile.date_of_birth; return; }
    const question = profile.date_of_birth ? t('dobConfirmChange', { date: pretty }) : t('dobConfirmFirst', { date: pretty });
    if (!window.confirm(question)) { el.value = profile.date_of_birth || ''; return; }
    queue('date_of_birth', value, true);
  }

  function renderDobInfo() {
    const box = $('#dobChanges');
    if (!profile || !profile.date_of_birth || profile.verified_at) { box.textContent = ''; return; }
    const left = 2 - (profile.dob_changes || 0);
    box.textContent = left > 0 ? '' : t('dobNoChangesLeft');   // the limit is not advertised
    $('#f_date_of_birth').disabled = left <= 0;
  }

  // Each sport has its own group on the form (positions plus that sport's
  // details); groups for sports the player does not play are hidden.
  function renderPositions() {
    const current = (profile && profile.positions) || {};
    const mine = (profile && profile.sports && profile.sports.length) ? profile.sports : Object.keys(OC_SPORTS);
    $$('[data-sport-block]').forEach(b => { b.hidden = !mine.includes(b.dataset.sportBlock); });
    Object.keys(OC_SPORTS).forEach(sport => {
      const box = document.getElementById('positions_' + sport);
      if (!box) return;
      // Older positions the player already saved stay visible (ticked) until they untick them.
      const old = ((OC_OLD_POSITIONS[sport] || [])).filter(pos => (current[sport] || []).includes(pos));
      box.innerHTML = OC_SPORTS[sport].concat(old).map(pos => `
        <label class="acct-chip"><input type="checkbox" data-sport="${sport}" value="${pos}" ${(current[sport] || []).includes(pos) ? 'checked' : ''} />
        <span>${ocEscape(ocPositionName(pos))}</span></label>`).join('');
    });
    $$('input[data-sport]').forEach(cb => cb.addEventListener('change', () => {
      // keep positions saved for a sport that is not shown (none are removed by accident)
      const obj = {};
      Object.keys(current).forEach(sp => { if (!mine.includes(sp)) obj[sp] = current[sp]; });
      $$('input[data-sport]:checked').forEach(c => { (obj[c.dataset.sport] = obj[c.dataset.sport] || []).push(c.value); });
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
    $('#f_show_sport_stats').checked = !!profile.show_sport_stats;
    $('#f_playing_since').max = new Date().getFullYear();
    const locked = !!profile.verified_at;
    $('#f_legal_name').disabled = locked;
    $('#f_date_of_birth').disabled = locked;
    $('#lockedNote').innerHTML = locked ? `<p class="acct-msg acct-msg-info">${ocEscape(t('lockedNote'))}</p>` : '';
    $('#f_date_of_birth').value = profile.date_of_birth || '';
    PHONE_FIELDS.forEach(n => phoneFill(n, profile[n]));
    fillShirtSizes();
    renderLevel();
    renderMySports();
    renderDobInfo();
    renderPositions();
  }

  // Shirt sizes, Bangladeshi jersey sizing (chest all round, inches).
  const SHIRT = [['XS', 32], ['S', 34], ['M', 36], ['L', 38], ['XL', 40], ['XXL', 42], ['XXXL', 44]];
  function fillShirtSizes() {
    const sel = $('#f_shirt_size');
    const v = (profile && profile.shirt_size) || sel.value || '';
    sel.innerHTML = `<option value="">${ocEscape(t('choose'))}</option>` + SHIRT.map(([size, inch]) =>
      `<option value="${size}">${ocEscape(t('shirtChest', { size, in: inch, cm: Math.round(inch * 2.54) }))}</option>`).join('');
    sel.value = v;
  }

  const LEVELS = { new: 'levelNew', amateur: 'levelAmateur', club: 'levelClub', league: 'levelLeague', national: 'levelNational' };
  // Level: the player chooses it once; after that it is locked and only
  // organisers can change it (the database enforces this, see 012).
  function renderLevel() {
    const lv = profile && profile.playing_level;
    $('#levelPick').hidden = !!lv;
    $('#levelValue').hidden = !lv;
    $('#levelValue').textContent = lv ? t(LEVELS[lv] || 'levelNotSet') : '';
    $('#levelHint').textContent = t(lv ? 'levelSetByUs' : 'levelChooseOnce');
    if (!lv) $('#f_playing_level').value = '';
  }
  function wireLevel() {
    const sel = $('#f_playing_level'), btn = $('#levelSave');
    sel.addEventListener('change', () => fieldErr('playing_level', ''));
    btn.addEventListener('click', async () => {
      if (ocIsBusy(btn)) return;
      if (!sel.value) { fieldErr('playing_level', t('levelNeed')); sel.focus(); return; }
      ocBusy(btn, true);
      const { data, error } = await db.from('profiles').update({ playing_level: sel.value }).eq('id', user.id).select().single();
      ocBusy(btn, false);
      if (error) { fieldErr('playing_level', ocErrorMessage(error)); return; }
      profile = data;
      renderLevel(); renderHome();
      showStatus(t('saved'));
    });
  }

  // Sports the player plays: shown as chips, with a button to add the other one.
  function sportName(sp) { return t('sport_' + sp); }
  function renderMySports() {
    const box = $('#mySports');
    const mine = (profile && profile.sports) || [];
    const others = Object.keys(OC_SPORTS).filter(sp => !mine.includes(sp));
    box.innerHTML = mine.map(sp => `<span class="acct-sportchip">${ocEscape(sportName(sp))}</span>`).join('') +
      others.map(sp => `<button type="button" class="acct-btn acct-btn-ghost acct-btn-small" data-add-sport="${sp}">${ocEscape(t('sportsAdd', { sport: sportName(sp) }))}</button>`).join('');
    $$('[data-add-sport]', box).forEach(b => b.addEventListener('click', async () => {
      if (ocIsBusy(b)) return;
      ocBusy(b, true);
      const next = mine.concat(b.dataset.addSport);
      const { data, error } = await db.from('profiles').update({ sports: next }).eq('id', user.id).select().single();
      ocBusy(b, false);
      if (error) { fieldErr('sports', ocErrorMessage(error)); return; }
      profile = data;
      renderMySports(); renderPositions(); renderHome();
      showStatus(t('saved'));
    }));
  }

  function wireSportsPick() {
    const boxes = () => $$('[data-pick-sport]');
    $('#sportsBtn').addEventListener('click', async () => {
      const chosen = boxes().filter(b => b.checked).map(b => b.value);
      if (!chosen.length) { msg('sportsMsg', t('sportsPickNeed'), 'error'); return; }
      if (ocIsBusy($('#sportsBtn'))) return;
      ocBusy($('#sportsBtn'), true);
      const { data, error } = await db.from('profiles').update({ sports: chosen }).eq('id', user.id).select().single();
      ocBusy($('#sportsBtn'), false);
      if (error) { msg('sportsMsg', ocErrorMessage(error), 'error'); return; }
      profile = data;
      await route();
    });
    boxes().forEach(b => b.addEventListener('change', () => msg('sportsMsg', '')));
  }

  // ---------- Home: welcome, code, checklist ----------
  function renderHome() {
    const name = profile.display_name || (profile.legal_name || '').split(/\s+/)[0];
    $('#welcomeTitle').textContent = name ? t('welcome', { name }) : t('welcomeNoName');

    $('#codeValue').textContent = profile.player_code || '—';
    $('#copyCode').hidden = !profile.player_code;
    $('#codePending').textContent = t(profile.player_code ? 'codeLoginTip' : 'codePending');
    $('#codeChangeWrap').hidden = !profile.player_code || !$('#codePicker').hidden;

    const age = ocAge(profile.date_of_birth);
    const under13 = age !== null && age < 13 && !profile.guardian_consent_at;
    $('#extended').hidden = under13;
    $('#ageNote').innerHTML = under13
      ? `<p class="acct-msg acct-msg-info">${ocEscape(t('under13'))}</p>`
      : (age !== null && age < 18 ? `<p class="acct-msg acct-msg-info">${ocEscape(t('under18'))}</p>` : '');

    const basics = !!(profile.legal_name && profile.date_of_birth && profile.gender);
    const contact = !!(profile.phone && profile.emergency_name && profile.emergency_relationship && profile.emergency_phone);
    const plays = (profile.sports || []);
    const sports = !!(profile.height_cm && profile.playing_level &&
      (!plays.includes('volleyball') || profile.dominant_hand) &&
      (!plays.includes('football') || profile.dominant_foot));
    const items = [
      { key: 'checkConsent', state: 'done' },
      { key: 'checkBasics', state: basics ? 'done' : 'todo' },
      { key: 'checkContact', state: under13 ? 'soon' : (contact ? 'done' : 'todo') },
      { key: 'checkSports', state: under13 ? 'soon' : (sports ? 'done' : 'todo') },
    ];

    const actionable = items.filter(i => i.state !== 'soon');
    const done = actionable.filter(i => i.state === 'done').length;
    $('#progressBar').style.width = Math.round(done / actionable.length * 100) + '%';
    $('#progressText').textContent = t('progress', { done, total: actionable.length });
    renderCard(age);
    const later = [['laterTeam', 'laterTeamWhy'], ['laterAgreement', 'laterAgreementWhy']];
    if (age === null || age < 18) later.push(['laterGuardian', 'laterGuardianWhy']);
    later.push(['laterId', 'laterIdWhy']);
    $('#laterList').innerHTML = later.map(([a, b]) => `<li><strong>${ocEscape(t(a))}</strong><span>${ocEscape(t(b))}</span></li>`).join('');
    $('#checklist').innerHTML = items.map(i => `
      <li><span class="acct-dot ${i.state === 'done' ? 'is-done' : i.state === 'soon' ? 'is-soon' : ''}" aria-hidden="true">✓</span>
      <span>${ocEscape(t(i.key))}</span>
      <span class="acct-tag">${ocEscape(t(i.state === 'done' ? 'done' : i.state === 'soon' ? 'soon' : 'todo'))}</span></li>`).join('');
    const allDone = done === actionable.length;
    let dismissed = false;
    try { dismissed = localStorage.getItem('oc_checklist_ok_' + user.id) === '1'; } catch (e) { /* private mode */ }
    $('#checklistDone').hidden = !allDone;
    $('#checklistCard').hidden = allDone && dismissed;
  }

  // ---------- Live player card ----------
  // Shown to organisers on the player's own phone when needed. The moving logo,
  // today's colour ring and the ticking clock make a screenshot easy to spot.
  let teamsCache = null, teamsLoaded = false;
  function renderCard(age) {
    const p = profile;
    $('#pcName').textContent = p.display_name || p.legal_name || t('welcomeNoName');
    $('#pcCode').textContent = p.player_code || '';
    $('#pcJersey').hidden = p.preferred_jersey == null;
    $('#pcJersey').textContent = p.preferred_jersey == null ? '' : '#' + p.preferred_jersey;
    $('#pcDob').textContent = p.date_of_birth
      ? new Date(p.date_of_birth + 'T00:00:00').toLocaleDateString(ocLang() === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const idb = $('#pcId');
    idb.textContent = t(p.verified_at ? 'cardIdOk' : 'cardIdNo');
    idb.className = 'acct-badge ' + (p.verified_at ? 'is-ok' : 'is-wait');

    // General details first, then one block per sport the player plays.
    const side = v => v ? t('side' + v[0].toUpperCase() + v.slice(1)) : null;
    const dl = list => list.filter(x => x[1] != null).map(([k, v]) => `<div><dt>${ocEscape(t(k))}</dt><dd>${ocEscape(String(v))}</dd></div>`).join('');
    const general = [
      ['cardHeight', p.height_cm ? p.height_cm + ' cm' : null],
      ['cardLevel', p.playing_level ? t(LEVELS[p.playing_level] || 'levelNotSet') : null],
      ['cardSince', p.playing_since || null],
    ];
    $('#pcStats').innerHTML = dl(general);
    const mine = (p.sports && p.sports.length) ? p.sports : Object.keys(p.positions || {});
    const extra = {
      volleyball: [['cardHand', side(p.dominant_hand)], ['cardReach', p.standing_reach_cm ? p.standing_reach_cm + ' cm' : null], ['cardJump', p.vertical_jump_cm ? p.vertical_jump_cm + ' cm' : null]],
      football: [['cardFoot', side(p.dominant_foot)]],
    };
    let filled = general.some(x => x[1] != null);
    $('#pcSports').innerHTML = Object.keys(OC_SPORTS).filter(sp => mine.includes(sp)).map(sp => {
      const pos = ((p.positions || {})[sp] || []).map(ocPositionName).join(', ');
      const facts = dl(extra[sp] || []);
      if (pos || facts) filled = true;
      return `<div class="acct-pc-sport"><p class="acct-pc-sub">${ocEscape(t('sport_' + sp))}</p>` +
        (pos ? `<p class="acct-pc-pos">${ocEscape(pos)}</p>` : '') +
        (facts ? `<dl class="acct-pc-stats">${facts}</dl>` : '') + '</div>';
    }).join('');
    $('#pcEmpty').hidden = filled;
    $('#playerCard').hidden = age !== null && age < 13 && !p.guardian_consent_at;
    bindCardOnce();
    renderPhoto();
    renderTeams();
    renderLive();
  }

  // The moving logo, daily colour and clock only show while an organiser has
  // the live card switched on (organiser page, for event days).
  let liveOn = null;
  async function renderLive() {
    if (liveOn === null) {
      const { data } = await db.from('site_settings').select('on_off').eq('key', 'live_card').maybeSingle();
      liveOn = !!(data && data.on_off);
    }
    $('#liveBox').hidden = !liveOn;
    $('#liveHint').hidden = !liveOn;
    if (liveOn) startLiveClock();
    else if (clockTimer) { clearInterval(clockTimer); clockTimer = null; }
  }

  async function renderTeams() {
    if (!teamsLoaded) {
      const { data, error } = await db.rpc('my_card');
      teamsCache = error ? [] : (data || []);
      teamsLoaded = true;
    }
    const box = $('#pcTeams');
    box.innerHTML = teamsCache.length
      ? '<ul class="acct-pc-teams">' + teamsCache.map(x =>
          `<li><strong>${ocEscape(x.team)}</strong><span>${ocEscape(x.event)} · ${ocEscape(x.category)}${x.jersey != null ? ' · #' + ocEscape(String(x.jersey)) : ''}</span>` +
          (x.status === 'approved' ? '' : `<span class="acct-tag">${ocEscape(t('cardWaiting'))}</span>`) + '</li>').join('') + '</ul>'
      : `<p class="acct-muted">${ocEscape(t('cardNoTournament'))}</p>`;
  }

  let clockTimer = null;
  function startLiveClock() {
    const tick = () => {
      const now = new Date();
      const bn = ocLang() === 'bn';
      $('#liveClock').textContent = now.toLocaleTimeString(bn ? 'bn-BD' : 'en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Dhaka' });
      $('#liveClock').setAttribute('datetime', now.toISOString());
      const c = ocCardColour(now);
      $('#liveDate').textContent = now.toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Dhaka' }) + ' · ' + t('cardTodayColour', { colour: c.name });
      $('#liveMark').style.setProperty('--live', c.hex);
    };
    tick();
    if (!clockTimer) clockTimer = setInterval(tick, 1000);
  }

  // ---------- Profile photo (private: only the player and organisers) ----------
  const photoPath = () => user.id + '/avatar.webp';
  let photoUrl = null, photoShownVersion = -1;

  function initials() {
    const n = (profile.display_name || profile.legal_name || '').trim();
    return n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  }

  async function renderPhoto() {
    const v = profile.avatar_version || 0;
    $('#pcInitials').textContent = initials();
    $('#photoAddLabel').textContent = t(v ? 'photoChange' : 'photoAdd');
    $('#photoRemove').hidden = !v;
    const mayAdd = !!profile.date_of_birth && (ocAge(profile.date_of_birth) >= 13 || !!profile.guardian_consent_at);
    $('#photoCtl').hidden = !mayAdd;
    if (!v) { $('#pcImg').hidden = true; photoShownVersion = 0; return; }
    if (v === photoShownVersion) return;
    // Download through the API (the page's security policy allows that), then show it as a local copy.
    const { data, error } = await db.storage.from('avatars').download(photoPath());
    if (error || !data) { $('#pcImg').hidden = true; return; }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(data);
    $('#pcImg').src = photoUrl;
    $('#pcImg').hidden = false;
    photoShownVersion = v;
  }

  // Square crop from the middle, 512 x 512, WebP (JPEG where the browser cannot make WebP).
  async function shrinkPhoto(file) {
    const bmp = await createImageBitmap(file);
    const side = Math.min(bmp.width, bmp.height);
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    c.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 512, 512);
    if (bmp.close) bmp.close();
    const make = (type) => new Promise(res => c.toBlob(res, type, 0.85));
    let blob = await make('image/webp');
    if (!blob || blob.type !== 'image/webp') blob = await make('image/jpeg');
    return blob;
  }

  async function savePhoto(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { msg('photoMsg', t('photoNotImage'), 'error'); return; }
    msg('photoMsg', t('photoSaving'), 'info');
    try {
      const blob = await shrinkPhoto(file);
      const up = await db.storage.from('avatars').upload(photoPath(), blob, { upsert: true, contentType: blob.type, cacheControl: '0' });
      if (up.error) throw up.error;
      const next = (profile.avatar_version || 0) + 1;
      const { data, error } = await db.from('profiles').update({ avatar_version: next }).eq('id', user.id).select('*').single();
      if (error) throw error;
      profile = data;
      await renderPhoto();
      msg('photoMsg', t('photoSaved'), 'ok');
    } catch (e) {
      msg('photoMsg', /guardian_required_under_13|row-level/.test(String(e && e.message)) ? t('errUnder13Save') : t('photoError'), 'error');
    }
    $('#photoInput').value = '';
  }

  async function removePhoto() {
    if (!window.confirm(t('photoRemoveConfirm'))) return;
    const rm = await db.storage.from('avatars').remove([photoPath()]);
    if (rm.error) { msg('photoMsg', t('photoError'), 'error'); return; }
    const { data, error } = await db.from('profiles').update({ avatar_version: 0 }).eq('id', user.id).select('*').single();
    if (!error && data) profile = data;
    await renderPhoto();
    msg('photoMsg', t('photoRemoved'), 'ok');
  }

  let cardBound = false;
  function bindCardOnce() {
    if (cardBound) return;
    cardBound = true;
    $('#photoInput').addEventListener('change', e => savePhoto(e.target.files && e.target.files[0]));
    $('#photoRemove').addEventListener('click', removePhoto);
    $('#checklistOk').addEventListener('click', () => {
      try { localStorage.setItem('oc_checklist_ok_' + user.id, '1'); } catch (e) { /* private mode */ }
      $('#checklistCard').hidden = true;
    });
  }
})();
