// SAMPLE ONLY (not live): the account page in sections.
// Overview, Profile, Team (coming soon), Settings, Privacy and data.
// It only moves the existing cards into sections and shows one section at a
// time, so js/account.js keeps working exactly as before. The address keeps the
// section (#profile, #team...), so the back button and shared links work.
// It also picks the line art on the player card from the sports the player
// plays (the owner's own drawings).
(function () {
  'use strict';
  var SECTIONS = [
    { id: 'overview', label: 'Overview' },
    { id: 'profile', label: 'Profile' },
    { id: 'team', label: 'Team' },
    { id: 'settings', label: 'Settings' },
    { id: 'privacy', label: 'Privacy and data' }
  ];

  function $(q, root) { return (root || document).querySelector(q); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  document.addEventListener('DOMContentLoaded', function () {
    var app = $('[data-view="app"]');
    if (!app) return;
    var codeCard = $('#codeValue') && $('#codeValue').closest('.acct-card');

    // ---------- section links ----------
    var nav = el('nav', 'acctx-tabs');
    nav.setAttribute('aria-label', 'Account sections');
    SECTIONS.forEach(function (s) {
      var a = el('a', null, s.label + (s.id === 'team' ? ' <span class="acctx-soon">Soon</span>' : ''));
      a.href = '#' + s.id; a.dataset.section = s.id;
      nav.appendChild(a);
    });

    // ---------- sections ----------
    var panels = {};
    SECTIONS.forEach(function (s) {
      var p = el('section', 'acctx-panel');
      p.id = 'p-' + s.id; p.dataset.panel = s.id; p.setAttribute('aria-label', s.label); p.tabIndex = -1;
      panels[s.id] = p;
    });
    function move(id, ids) { ids.forEach(function (q) { var n = typeof q === 'string' ? $(q) : q; if (n) panels[id].appendChild(n); }); }

    move('overview', ['#unfinishedCard', '#playerCard', '#checklistCard', '#laterCard', '#ageNote']);
    move('profile', ['#profileForm']);

    panels.team.appendChild(el('div', 'acct-card acctx-team', [
      '<span class="acctx-art acctx-art-set" aria-hidden="true"></span>',
      '<p class="acctx-badge">Coming soon</p>',
      '<h2>Teams</h2>',
      '<p class="acctx-lead">Soon you will create a team or join one right here, from your account.</p>',
      '<ol class="acctx-steps">',
      '<li><strong>Create or join.</strong> Start a team, or open the link your captain shares.</li>',
      '<li><strong>Captain and vice-captain.</strong> Every team has both, and both play on the team.</li>',
      '<li><strong>Nothing to fill in twice.</strong> Your details come straight from your profile.</li>',
      '</ol>',
      '<p class="acct-muted">Until then, a complete profile means you are ready the moment registration opens.</p>',
      '<a class="acct-btn acct-btn-small" href="#profile">Go to my profile</a>'
    ].join('')));

    panels.settings.appendChild(el('h2', 'acctx-panel-title', 'Settings'));
    move('settings', [codeCard]);
    panels.settings.appendChild(el('div', 'acct-card', [
      '<h2>Language</h2>',
      '<p class="acct-muted">Shows the whole site in this language on this device.</p>',
      '<div class="acctx-langs"><button type="button" class="acct-btn acct-btn-ghost acct-btn-small" data-acctx-lang="en">English</button>',
      '<button type="button" class="acct-btn acct-btn-ghost acct-btn-small" data-acctx-lang="bn" lang="bn">বাংলা</button></div>'
    ].join('')));
    panels.settings.appendChild(el('div', 'acct-card', [
      '<h2>Log out</h2>',
      '<p class="acct-muted">Logs you out on this device only. Your profile stays saved.</p>',
      '<button type="button" class="acct-btn acct-btn-ghost acct-btn-small" data-acctx-signout>Log out</button>'
    ].join('')));

    panels.privacy.appendChild(el('h2', 'acctx-panel-title', 'Privacy and data'));
    panels.privacy.appendChild(el('div', 'acct-card', [
      '<h2>Who sees what</h2>',
      '<ul class="acctx-facts">',
      '<li><strong>Your photo:</strong> only you and Obsidian Cup organisers.</li>',
      '<li><strong>A photo of your ID</strong>, when an event asks for it: private, and deleted 30 days after the event.</li>',
      '<li><strong>What shows publicly</strong> is up to you: change it under <a href="#profile">Profile</a>, in Preferences.</li>',
      '</ul>',
      '<p class="acct-muted">The full details are in the <a href="legal.html">Terms and Privacy notice</a>.</p>'
    ].join('')));
    move('privacy', ['#deleteCard']);

    // place: links, then the sections, after the welcome and messages
    var after = $('#appMsg');
    after.insertAdjacentElement('afterend', nav);
    var holder = el('div', 'acctx-panels');
    SECTIONS.forEach(function (s) { holder.appendChild(panels[s.id]); });
    nav.insertAdjacentElement('afterend', holder);

    // ---------- show one section ----------
    function current() { var h = (location.hash || '').slice(1); return panels[h] ? h : 'overview'; }
    function showSection(id, focus) {
      SECTIONS.forEach(function (s) {
        var on = s.id === id;
        panels[s.id].hidden = !on;
        var a = nav.querySelector('[data-section="' + s.id + '"]');
        if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      if (focus) panels[id].focus({ preventScroll: true });
    }
    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').slice(1);
      if (panels[h]) { showSection(h, true); window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 80)); }
      else if (h) {   // a link to something inside a section, e.g. #x-contact
        var t = document.getElementById(h), p = t && t.closest('.acctx-panel');
        if (p) showSection(p.dataset.panel, false);
      }
    });
    showSection(current(), false);

    // "Finish my profile" and the checklist lead into Profile first
    document.addEventListener('click', function (e) {
      if (e.target.closest('#unfinishedGo')) { history.replaceState(null, '', '#profile'); showSection('profile', false); }
    }, true);

    // settings buttons use the site's own controls
    panels.settings.addEventListener('click', function (e) {
      var l = e.target.closest('[data-acctx-lang]');
      if (l) { var b = document.querySelector('.lang-btn[data-lang="' + l.dataset.acctxLang + '"]'); if (b) b.click(); }
      if (e.target.closest('[data-acctx-signout]')) { var s = app.querySelector('[data-action="signout"]'); if (s) s.click(); }
    });

    // ---------- line art on the player card, by sport ----------
    var art = $('#playerCard .acctx-art');
    function pickArt() {
      if (!art) return;
      var vb = $('[data-sport-block="volleyball"]'), fb = $('[data-sport-block="football"]');
      var plays = { vb: vb && !vb.hidden, fb: fb && !fb.hidden };
      art.className = 'acctx-art ' + (plays.vb && plays.fb ? 'acctx-art-both' : plays.fb ? 'acctx-art-fb' : 'acctx-art-vb');
    }
    pickArt();
    document.querySelectorAll('[data-sport-block]').forEach(function (b) {
      new MutationObserver(pickArt).observe(b, { attributes: true, attributeFilter: ['hidden'] });
    });
  });
})();
