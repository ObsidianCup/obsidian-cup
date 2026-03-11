/* ============================================
   OBSIDIAN CUP — Shared Components
   Navbar + Footer + Modal injected into every page
   ============================================ */

function getNavPath(file) {
  // Works whether pages are in root or /pages/
  const isInPages = window.location.pathname.includes('/pages/');
  return isInPages ? `../${file}` : file;
}

function injectNav() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  const p = (f) => getNavPath(f);
  const a = (f) => getNavPath(f); // assets path same logic

  nav.innerHTML = `
    <a href="${p('index.html')}" class="nav-logo">
      <img src="${a('assets/logo-mark.png')}" alt="Obsidian Cup" class="nav-logo-img" />
      <span class="nav-logo-text">Obsidian Cup</span>
    </a>
    <ul class="nav-links">
      <li><a href="${p('index.html')}">Home</a></li>
      <li><a href="${p('pages/tournaments.html')}">Tournaments</a></li>
      <li><a href="${p('pages/about.html')}">About</a></li>
      ${SITE_CONFIG.tournamentActive ? `<li><a href="${p('pages/fixtures.html')}">Fixtures</a></li>` : ''}
      ${SITE_CONFIG.registrationOpen ? `<li><a href="${p('pages/register.html')}">Register</a></li>` : ''}
      ${SITE_CONFIG.rulesVisible ? `<li><a href="${p('pages/rules.html')}">Rules</a></li>` : ''}
    </ul>
    <button class="hamburger" aria-label="Open menu">
      <span></span><span></span><span></span>
    </button>
  `;

  document.body.insertBefore(nav, document.body.firstChild);

  // Mobile menu
  const mobile = document.createElement('div');
  mobile.className = 'mobile-menu';
  mobile.innerHTML = `
    <button class="mobile-close" aria-label="Close menu">×</button>
    <img src="${a('assets/logo-mark.png')}" alt="Obsidian Cup" class="mobile-logo" />
    <a href="${p('index.html')}">Home</a>
    <a href="${p('pages/tournaments.html')}">Tournaments</a>
    <a href="${p('pages/about.html')}">About</a>
    ${SITE_CONFIG.tournamentActive ? `<a href="${p('pages/fixtures.html')}">Fixtures</a>` : ''}
    ${SITE_CONFIG.registrationOpen ? `<a href="${p('pages/register.html')}">Register</a>` : ''}
    ${SITE_CONFIG.rulesVisible ? `<a href="${p('pages/rules.html')}">Rules</a>` : ''}
  `;
  document.body.appendChild(mobile);
}

function injectFooter() {
  const p = (f) => getNavPath(f);
  const a = (f) => getNavPath(f);
  const footer = document.createElement('footer');
  footer.innerHTML = `
    <img src="${a('assets/logo-mark.png')}" alt="Obsidian Cup" class="footer-logo-img" />
    <div class="footer-logo">Obsidian Cup</div>
    <div class="footer-tagline">Carved by Legacy, Crowned in Obsidian</div>
    <div class="divider"><div class="divider-diamond"></div></div>
    <div class="footer-links">
      <a href="${p('pages/tournaments.html')}">Tournaments</a>
      <a href="${p('pages/about.html')}">About</a>
      <a href="https://www.instagram.com/obsidiancup/" target="_blank" rel="noopener">Instagram</a>
      <a href="https://www.facebook.com/share/1Cb8jWH5Gy/" target="_blank" rel="noopener">Facebook</a>
      <a href="${p('pages/about.html')}#contact">Contact</a>
    </div>
    <p class="footer-copy">© 2026 Obsidian Cup &mdash; All Rights Reserved</p>
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

// Auto-inject on load
document.addEventListener('DOMContentLoaded', () => {
  injectNav();
  injectFooter();
  injectBackToTop();
});
