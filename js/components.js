/* ============================================
   OBSIDIAN CUP — Shared Components
   Navbar + Footer + Modal injected into every page
   ============================================ */

function getNavPath(file) {
  const isInPages = window.location.pathname.includes('/pages/');
  return isInPages ? `../${file}` : file;
}

function injectNav() {
  const nav = document.createElement('header');
  nav.setAttribute('role', 'banner');
  nav.className = 'navbar';
  const p = (f) => getNavPath(f);
  const a = (f) => getNavPath(f);

  nav.innerHTML = `
    <a href="${p('index.html')}" class="nav-logo" aria-label="Obsidian Cup Home">
      <img src="${a('assets/logo-mark.png')}" alt="Obsidian Cup logo" class="nav-logo-img" loading="lazy" />
      <span class="nav-logo-text">Obsidian Cup</span>
    </a>
    <nav role="navigation" aria-label="Main navigation">
      <ul class="nav-links">
        <li><a href="${p('index.html')}" data-key="navHome">Home</a></li>
        <li><a href="${p('pages/tournaments.html')}" data-key="navTournaments">Tournaments</a></li>
        <li><a href="${p('pages/about.html')}" data-key="navAbout">About</a></li>
        <li><a href="${p('pages/faq.html')}" data-key="navFaq">FAQ</a></li>
        ${SITE_CONFIG.tournamentActive ? `<li><a href="${p('pages/fixtures.html')}" data-key="navFixtures">Fixtures</a></li>` : ''}
        ${SITE_CONFIG.registrationOpen ? `<li><a href="${p('pages/register.html')}" class="nav-register-btn" data-key="navRegister">Register</a></li>` : ''}
        ${SITE_CONFIG.rulesVisible ? `<li><a href="${p('pages/rules.html')}">Rules</a></li>` : ''}
      </ul>
    </nav>
    <div class="lang-toggle" role="group" aria-label="Language toggle">
      <button class="lang-btn" data-lang="en" onclick="setLanguage('en')" aria-label="Switch to English">EN</button>
      <span class="lang-sep">|</span>
      <button class="lang-btn" data-lang="bn" onclick="setLanguage('bn')" aria-label="বাংলায় পরিবর্তন করুন">বাংলা</button>
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
    <img src="${a('assets/logo-mark.png')}" alt="Obsidian Cup" class="mobile-logo" loading="lazy" />
    <a href="${p('index.html')}" data-key="navHome">Home</a>
    <a href="${p('pages/tournaments.html')}" data-key="navTournaments">Tournaments</a>
    <a href="${p('pages/about.html')}" data-key="navAbout">About</a>
    <a href="${p('pages/faq.html')}" data-key="navFaq">FAQ</a>
    ${SITE_CONFIG.tournamentActive ? `<a href="${p('pages/fixtures.html')}">Fixtures</a>` : ''}
    ${SITE_CONFIG.registrationOpen ? `<a href="${p('pages/register.html')}" data-key="navRegister">Register</a>` : ''}
    ${SITE_CONFIG.rulesVisible ? `<a href="${p('pages/rules.html')}">Rules</a>` : ''}
    <div class="lang-toggle lang-toggle-mobile" role="group" aria-label="Language toggle">
      <button class="lang-btn" data-lang="en" onclick="setLanguage('en')" aria-label="Switch to English">EN</button>
      <span class="lang-sep">|</span>
      <button class="lang-btn" data-lang="bn" onclick="setLanguage('bn')" aria-label="বাংলায় পরিবর্তন করুন">বাংলা</button>
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
    <img src="${a('assets/logo-mark.png')}" alt="Obsidian Cup" class="footer-logo-img" loading="lazy" />
    <div class="footer-logo">Obsidian Cup</div>
    <div class="footer-tagline" data-key="footerTagline">Carved by Legacy, Crowned in Obsidian</div>
    <div class="divider"><div class="divider-diamond"></div></div>
    <nav class="footer-links" aria-label="Footer navigation">
      <a href="${p('pages/tournaments.html')}" data-key="navTournaments">Tournaments</a>
      <a href="${p('pages/about.html')}" data-key="navAbout">About</a>
      <a href="${p('pages/faq.html')}" data-key="navFaq">FAQ</a>
      <a href="https://www.instagram.com/obsidiancup/" target="_blank" rel="noopener" aria-label="Obsidian Cup on Instagram">Instagram</a>
      <a href="https://www.facebook.com/share/1Cb8jWH5Gy/" target="_blank" rel="noopener" aria-label="Obsidian Cup on Facebook">Facebook</a>
      <a href="${p('pages/about.html')}#contact">Contact</a>
    </nav>
    <p class="footer-copy">© 2026 Obsidian Cup. All Rights Reserved.</p>
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

document.addEventListener('DOMContentLoaded', () => {
  injectNav();
  injectFooter();
  injectBackToTop();
  if (typeof initLanguage === 'function') initLanguage();
});
