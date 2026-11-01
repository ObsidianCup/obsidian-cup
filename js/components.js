/* ============================================
   OBSIDIAN CUP — Shared Components
   Navbar + Footer + Modal injected into every page
   ============================================ */

function getNavPath(file) {
  // Root-relative links work from any page, including the 404 page at any URL
  return file === 'index.html' ? '/' : `/${file}`;
}

function injectNav() {
  const nav = document.createElement('header');
  nav.setAttribute('role', 'banner');
  nav.className = 'navbar';
  const p = (f) => getNavPath(f);
  const a = (f) => getNavPath(f);

  nav.innerHTML = `
    <a href="${p('index.html')}" class="nav-logo" aria-label="Obsidian Cup Home">
      <img src="${a('assets/logo-oc.svg')}" alt="Obsidian Cup logo" class="nav-logo-img" width="45" height="32" loading="lazy" />
      <span class="nav-logo-text">Obsidian Cup</span>
    </a>
    <nav role="navigation" aria-label="Main navigation">
      <ul class="nav-links">
        <li><a href="${p('index.html')}" data-key="navHome">Home</a></li>
        <li><a href="${p('pages/football.html')}" data-key="navFootball">Football</a></li>
        <li><a href="${p('pages/volleyball.html')}" data-key="navVolleyball">Volleyball</a></li>
        <li><a href="${p('pages/tournaments.html')}" data-key="navTournaments">Tournaments</a></li>
        <li><a href="${p('pages/about.html')}" data-key="navAbout">About</a></li>
        <li><a href="${p('pages/faq.html')}" data-key="navFaq">FAQ</a></li>
        ${SITE_CONFIG.tournamentActive ? `<li><a href="${p('pages/fixtures.html')}" data-key="navFixtures">Fixtures</a></li>` : ''}
        ${SITE_CONFIG.registrationOpen ? `<li><a href="${p('pages/register.html')}" class="nav-register-btn" data-key="navRegister">Register</a></li>` : ''}
        ${SITE_CONFIG.rulesVisible ? `<li><a href="${p('pages/rules.html')}">Rules</a></li>` : ''}
        ${SITE_CONFIG.accountsEnabled ? `<li><a href="${p('pages/account.html')}" data-key="navAccount">Log in</a></li>` : ''}
      </ul>
    </nav>
    <div class="lang-toggle" role="group" aria-label="Language toggle">
      <button class="lang-btn" data-lang="en" aria-label="Switch to English">EN</button>
      <span class="lang-sep">|</span>
      <button class="lang-btn" data-lang="bn" aria-label="বাংলায় পরিবর্তন করুন">বাংলা</button>
    </div>
    <button class="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">
      <span></span><span></span><span></span>
    </button>
  `;

  document.body.insertBefore(nav, document.body.firstChild);

  // Mobile menu
  const mobile = document.createElement('div');
  mobile.className = 'mobile-menu';
  mobile.id = 'mobileMenu';
  mobile.setAttribute('role', 'dialog');
  mobile.setAttribute('aria-label', 'Mobile navigation');
  mobile.innerHTML = `
    <button class="mobile-close" aria-label="Close menu">×</button>
    <img src="${a('assets/logo-oc.svg')}" alt="Obsidian Cup" class="mobile-logo" width="84" height="60" loading="lazy" />
    <a href="${p('index.html')}" data-key="navHome">Home</a>
    <a href="${p('pages/football.html')}" data-key="navFootball">Football</a>
    <a href="${p('pages/volleyball.html')}" data-key="navVolleyball">Volleyball</a>
    <a href="${p('pages/tournaments.html')}" data-key="navTournaments">Tournaments</a>
    <a href="${p('pages/about.html')}" data-key="navAbout">About</a>
    <a href="${p('pages/faq.html')}" data-key="navFaq">FAQ</a>
    ${SITE_CONFIG.tournamentActive ? `<a href="${p('pages/fixtures.html')}">Fixtures</a>` : ''}
    ${SITE_CONFIG.registrationOpen ? `<a href="${p('pages/register.html')}" data-key="navRegister">Register</a>` : ''}
    ${SITE_CONFIG.rulesVisible ? `<a href="${p('pages/rules.html')}">Rules</a>` : ''}
    ${SITE_CONFIG.accountsEnabled ? `<a href="${p('pages/account.html')}" data-key="navAccount">Log in</a>` : ''}
    <div class="lang-toggle lang-toggle-mobile" role="group" aria-label="Language toggle">
      <button class="lang-btn" data-lang="en" aria-label="Switch to English">EN</button>
      <span class="lang-sep">|</span>
      <button class="lang-btn" data-lang="bn" aria-label="বাংলায় পরিবর্তন করুন">বাংলা</button>
    </div>
  `;
  document.body.appendChild(mobile);
}

function injectFooter() {
  const p = (f) => getNavPath(f);
  const a = (f) => getNavPath(f);
  const footer = document.createElement('footer');
  footer.setAttribute('role', 'contentinfo');
  footer.innerHTML = `
    <img src="${a('assets/logo-oc.svg')}" alt="Obsidian Cup" class="footer-logo-img" width="70" height="50" loading="lazy" />
    <div class="footer-logo">Obsidian Cup</div>
    <p class="footer-tagline" data-key="footerTagline">Carved by Legacy · Crowned in Obsidian</p>
    <div class="divider"><div class="divider-diamond"></div></div>
    <nav class="footer-links" aria-label="Footer navigation">
      <a href="${p('pages/football.html')}" data-key="navFootball">Football</a>
      <a href="${p('pages/volleyball.html')}" data-key="navVolleyball">Volleyball</a>
      <a href="${p('pages/tournaments.html')}" data-key="navTournaments">Tournaments</a>
      <a href="${p('pages/about.html')}" data-key="navAbout">About</a>
      <a href="${p('pages/faq.html')}" data-key="navFaq">FAQ</a>
      <a href="${p('pages/experiences.html')}">Experiences</a>
      <a href="${SITE_CONFIG.instagramVolleyballUrl}" target="_blank" rel="noopener">Volleyball Instagram</a>
      <a href="${SITE_CONFIG.instagramFutsalUrl}" target="_blank" rel="noopener">Futsal Instagram</a>
      <a href="https://www.facebook.com/share/1Cb8jWH5Gy/" target="_blank" rel="noopener" aria-label="Obsidian Cup on Facebook">Facebook</a>
      <a href="${p('pages/about.html')}#contact">Contact</a>
      ${SITE_CONFIG.accountsEnabled ? `<a href="${p('pages/legal.html')}?doc=privacy">Privacy</a><a href="${p('pages/legal.html')}?doc=terms">Terms</a>` : ''}
    </nav>
    <p class="footer-copy">© ${new Date().getFullYear()} Obsidian Cup. All Rights Reserved.</p>
  `;
  document.body.appendChild(footer);
}

function injectBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.innerHTML = '↑';
  btn.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(btn);
}

/* ---------- "Obsidian Glass" pages (body.theme-glass) ---------- */
function glassLinks() {
  const p = (f) => getNavPath(f);
  const links = [
    ['pages/volleyball.html', 'navVolleyball', 'Volleyball'],
    ['pages/football.html', 'navFootball', 'Football'],
    ['pages/tournaments.html', 'navSeasons', 'Past seasons'],
    ['pages/about.html', 'navAbout', 'About'],
    ['pages/faq.html', 'navQuestions', 'Questions'],
  ];
  if (SITE_CONFIG.tournamentActive) links.push(['pages/fixtures.html', 'navFixtures', 'Fixtures']);
  if (SITE_CONFIG.rulesVisible) links.push(['pages/rules.html', 'navRules', 'Rules']);
  const here = location.pathname.replace(/\/$/, '/index.html');
  return links.map(([f, key, label]) =>
    `<li><a href="${p(f)}" data-key="${key}"${here.endsWith(f) ? ' aria-current="page"' : ''}>${label}</a></li>`).join('');
}

function injectGlassChrome() {
  const p = (f) => getNavPath(f);
  const lang = `<div class="g-lang lang-toggle" role="group" aria-label="Language">
      <button type="button" class="lang-btn" data-lang="en">English</button>
      <button type="button" class="lang-btn" data-lang="bn" lang="bn">বাংলা</button>
    </div>`;
  const login = SITE_CONFIG.accountsEnabled
    ? `<a class="g-btn g-btn-second g-btn-small" href="${p('pages/account.html')}" data-key="navAccount">Log in</a>` : '';

  const header = document.createElement('header');
  header.className = 'g-header';
  header.innerHTML = `
    <a class="g-skip" href="#main">Skip to content</a>
    <div class="g-wrap g-header-inner">
      <a class="g-brand" href="${p('index.html')}" aria-label="Obsidian Cup home">
        <img src="${p('assets/logo-oc.svg')}" alt="" width="42" height="30" />
        <span>Obsidian Cup</span>
      </a>
      <nav class="g-nav" aria-label="Main"><ul>${glassLinks()}</ul></nav>
      <div class="g-tools">
        ${lang}
        ${login}
        <button type="button" class="g-menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="gMenu">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7h14M3 13h14"/></svg>
        </button>
      </div>
    </div>`;
  document.body.insertBefore(header, document.body.firstChild);

  const menu = document.createElement('div');
  menu.className = 'g-menu';
  menu.id = 'gMenu';
  menu.setAttribute('data-open', 'false');
  menu.innerHTML = `<nav aria-label="Main"><ul>${glassLinks()}</ul></nav>${lang}`;
  header.after(menu);

  const btn = header.querySelector('.g-menu-btn');
  const setOpen = (open, returnFocus) => {
    menu.setAttribute('data-open', String(open));
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) { const first = menu.querySelector('a'); if (first) first.focus(); }
    else if (returnFocus) btn.focus();
  };
  btn.addEventListener('click', () => setOpen(menu.getAttribute('data-open') !== 'true', true));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.getAttribute('data-open') === 'true') setOpen(false, true); });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false, false); });

  const year = new Date().getFullYear();
  const footer = document.createElement('footer');
  footer.className = 'g-footer';
  footer.innerHTML = `
    <div class="g-wrap">
      <div class="g-footer-top">
        <div class="g-footer-brand">
          <img src="${p('assets/logo-oc.svg')}" alt="Obsidian Cup" width="56" height="40" />
          <p class="g-meta" data-key="footerAbout">Volleyball and football tournaments in Dhaka, run by players, for players of every level.</p>
        </div>
        <nav aria-label="Footer"><ul>
          <li><a href="${p('pages/volleyball.html')}" data-key="navVolleyball">Volleyball</a></li>
          <li><a href="${SITE_CONFIG.instagramVolleyballUrl}" target="_blank" rel="noopener" data-key="footerIgVolleyball">Volleyball Instagram</a></li>
          <li><a href="${p('pages/football.html')}" data-key="navFootball">Football</a></li>
          <li><a href="${SITE_CONFIG.instagramFutsalUrl}" target="_blank" rel="noopener" data-key="footerIgFutsal">Futsal Instagram</a></li>
          <li><a href="${p('pages/tournaments.html')}" data-key="navSeasons">Past seasons</a></li>
          <li><a href="https://www.facebook.com/share/1Cb8jWH5Gy/" target="_blank" rel="noopener">Facebook</a></li>
          <li><a href="${p('pages/experiences.html')}" data-key="navExperiences">Player stories</a></li>
          <li><a href="mailto:${SITE_CONFIG.contactEmail}" data-key="footerEmail">Email us</a></li>
          ${SITE_CONFIG.accountsEnabled ? `<li><a href="${p('pages/legal.html')}?doc=privacy" data-key="footerPrivacy">Privacy</a></li><li><a href="${p('pages/legal.html')}?doc=terms" data-key="footerTerms">Terms</a></li>` : ''}
        </ul></nav>
      </div>
      <div class="g-footer-bottom">
        <span>© ${year} Obsidian Cup, Dhaka, Bangladesh</span>
        <span data-key="footerTagline2">Carved by legacy, crowned in obsidian</span>
      </div>
    </div>`;
  document.body.appendChild(footer);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.classList.contains('theme-glass')) {
    injectGlassChrome();
    if (typeof initLanguage === 'function') initLanguage();
    return;
  }
  injectNav();
  injectFooter();
  injectBackToTop();
  if (typeof initLanguage === 'function') initLanguage();
});
