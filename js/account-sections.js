// Account page in sections (owner approved 18 Nov 2026).
// Overview, Profile, Team (coming soon), Settings, Privacy and data.
// It only moves the existing cards into sections and shows one section at a
// time, so js/account.js keeps working exactly as before. The address keeps the
// section (#profile, #team...), so the back button and shared links work.
// It also picks the line art on the player card from the sports the player
// plays (the owner's own drawings).
(function () {
  'use strict';
  // labels are text keys in js/oc-accounts.js (English and Bangla)
  var SECTIONS = [
    { id: 'overview', key: 'secOverview' },
    { id: 'profile', key: 'secProfile' },
    { id: 'team', key: 'secTeam' },
    { id: 'settings', key: 'secSettings' },
    { id: 'privacy', key: 'secPrivacy' }
  ];
  function T(key) { return '<span data-t="' + key + '"></span>'; }

  function $(q, root) { return (root || document).querySelector(q); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  document.addEventListener('DOMContentLoaded', function () {
    var app = $('[data-view="app"]');
    if (!app) return;
    var codeCard = $('#codeValue') && $('#codeValue').closest('.acct-card');

    // ---------- section links ----------
    var nav = el('nav', 'acctx-tabs');
    nav.setAttribute('aria-label', t('secNavLabel'));
    SECTIONS.forEach(function (s) {
      var a = el('a', null, T(s.key) + (s.id === 'team' ? ' <span class="acctx-soon" data-t="secSoon"></span>' : ''));
      a.href = '#' + s.id; a.dataset.section = s.id;
      nav.appendChild(a);
    });

    // ---------- sections ----------
    var panels = {};
    SECTIONS.forEach(function (s) {
      var p = el('section', 'acctx-panel');
      p.id = 'p-' + s.id; p.dataset.panel = s.id; p.setAttribute('aria-label', t(s.key)); p.tabIndex = -1;
      panels[s.id] = p;
    });
    function move(id, ids) { ids.forEach(function (q) { var n = typeof q === 'string' ? $(q) : q; if (n) panels[id].appendChild(n); }); }

    move('overview', ['#unfinishedCard', '#playerCard', '#checklistCard', '#laterCard', '#ageNote']);
    move('profile', ['#profileForm']);

    panels.team.appendChild(el('div', 'acct-card acctx-team', [
      '<span class="acctx-art acctx-art-set" aria-hidden="true"></span>',
      '<p class="acctx-badge" data-t="teamBadge"></p>',
      '<h2 data-t="teamTitle"></h2>',
      '<p class="acctx-lead" data-t="teamLead"></p>',
      '<ol class="acctx-steps">',
      '<li><strong data-t="teamStep1Title"></strong> ' + T('teamStep1') + '</li>',
      '<li><strong data-t="teamStep2Title"></strong> ' + T('teamStep2') + '</li>',
      '<li><strong data-t="teamStep3Title"></strong> ' + T('teamStep3') + '</li>',
      '</ol>',
      '<p class="acct-muted" data-t="teamUntil"></p>',
      '<a class="acct-btn acct-btn-small" href="#profile" data-t="teamGo"></a>'
    ].join('')));

    panels.settings.appendChild(el('h2', 'acctx-panel-title', T('secSettings')));
    move('settings', [codeCard]);
    panels.settings.appendChild(el('div', 'acct-card', [
      '<h2 data-t="langTitle"></h2>',
      '<p class="acct-muted" data-t="langNote"></p>',
      '<div class="acctx-langs"><button type="button" class="acct-btn acct-btn-ghost acct-btn-small" data-acctx-lang="en">English</button>',
      '<button type="button" class="acct-btn acct-btn-ghost acct-btn-small" data-acctx-lang="bn" lang="bn">বাংলা</button></div>'
    ].join('')));
    panels.settings.appendChild(el('div', 'acct-card', [
      '<h2 data-t="logoutTitle"></h2>',
      '<p class="acct-muted" data-t="logoutNote"></p>',
      '<button type="button" class="acct-btn acct-btn-ghost acct-btn-small" data-acctx-signout data-t="signOut"></button>'
    ].join('')));

    panels.privacy.appendChild(el('h2', 'acctx-panel-title', T('secPrivacy')));
    panels.privacy.appendChild(el('div', 'acct-card', [
      '<h2 data-t="privWho"></h2>',
      '<ul class="acctx-facts">',
      '<li><strong data-t="privPhotoT"></strong> ' + T('privPhoto') + '</li>',
      '<li><strong data-t="privIdT"></strong> ' + T('privId') + '</li>',
      '<li><strong data-t="privPublicT"></strong> ' + T('privPublicA') + ' <a href="#profile" data-t="secProfile"></a>' + T('privPublicB') + '</li>',
      '</ul>',
      '<p class="acct-muted">' + T('privMoreA') + ' <a href="legal.html" data-t="privMoreLink"></a>' + T('privMoreB') + '</p>'
    ].join('')));
    move('privacy', ['#deleteCard']);

    // place: links, then the sections, after the welcome and messages
    var after = $('#appMsg');
    after.insertAdjacentElement('afterend', nav);
    var holder = el('div', 'acctx-panels');
    SECTIONS.forEach(function (s) { holder.appendChild(panels[s.id]); });
    nav.insertAdjacentElement('afterend', holder);
    ocApplyText(nav); ocApplyText(holder);
    document.addEventListener('oc:language', function () { nav.setAttribute('aria-label', t('secNavLabel')); SECTIONS.forEach(function (s) { panels[s.id].setAttribute('aria-label', t(s.key)); }); });

    // ---------- show one section ----------
    function current() { var h = (location.hash || '').slice(1); return panels[h] ? h : 'overview'; }
    function showSection(id, focus) {
      SECTIONS.forEach(function (s) {
        var on = s.id === id;
        panels[s.id].hidden = !on;
        var a = nav.querySelector('[data-section="' + s.id + '"]');
        if (on) {
          a.setAttribute('aria-current', 'page');
          // phones: slide the tab row so the chosen tab is fully in view
          var l = a.offsetLeft - nav.offsetLeft, r = l + a.offsetWidth;
          if (l < nav.scrollLeft + 16) nav.scrollLeft = Math.max(0, l - 24);
          else if (r > nav.scrollLeft + nav.clientWidth - 40) nav.scrollLeft = r - nav.clientWidth + 48;
        } else a.removeAttribute('aria-current');
      });
      if (focus) panels[id].focus({ preventScroll: true });
    }
    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').slice(1);
      if (panels[h]) { showSection(h, true); window.scrollTo(0, Math.max(0, app.getBoundingClientRect().top + window.scrollY - 80)); }
      else if (h) {   // a link to something inside a section, e.g. #x-contact
        var target = document.getElementById(h), p = target && target.closest('.acctx-panel');
        if (p) showSection(p.dataset.panel, false);
      }
    });
    showSection(current(), false);

    // logging out forgets the initial shown in the menu bar
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="signout"]')) { try { localStorage.removeItem('oc_initial'); } catch (x) { /* private mode */ } }
    }, true);

    // "Finish my profile" and the checklist lead into Profile first
    document.addEventListener('click', function (e) {
      if (e.target.closest('#unfinishedGo')) { history.replaceState(null, '', '#profile'); showSection('profile', false); }
    }, true);

    // settings buttons use the site's own controls
    panels.settings.addEventListener('click', function (e) {
      var l = e.target.closest('[data-acctx-lang]');
      if (l) { var b = document.querySelector('.lang-btn[data-lang="' + l.dataset.acctxLang + '"]'); if (b) b.click(); }
      if (e.target.closest('[data-acctx-signout]')) { try { localStorage.removeItem('oc_initial'); } catch (x) { /* private mode */ } var s = app.querySelector('[data-action="signout"]'); if (s) s.click(); }
    });

    // ---------- menu bar: the player's initial instead of "Account" ----------
    function initialBadge() {
      var letter = ($('#pcInitials') && $('#pcInitials').textContent.trim().charAt(0)) || '';
      if (!letter || app.hidden) return false;
      try { localStorage.setItem('oc_initial', letter.toUpperCase()); } catch (e) { /* private mode */ }
      if (typeof ocHeaderInitial === 'function') ocHeaderInitial();
      return true;
    }
    var tries = 0, timer = setInterval(function () { if (initialBadge() || ++tries > 40) clearInterval(timer); }, 250);

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
