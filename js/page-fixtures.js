// Page script for pages/fixtures.html. While a tournament is running
// (SITE_CONFIG.tournamentActive), the heading shows the season, dates and venue.
document.addEventListener('DOMContentLoaded', () => {
  if (!SITE_CONFIG.tournamentActive) return;
  const head = document.getElementById('fxHead');
  const set = (sel, text) => { const el = head.querySelector(sel); el.removeAttribute('data-key'); el.textContent = text; };
  set('.g-kicker', SITE_CONFIG.currentSeasonName || 'Live fixtures');
  set('h1', 'Fixtures');
  set('.g-lead', [SITE_CONFIG.currentSeasonDates, SITE_CONFIG.currentVenue].filter(Boolean).join(' · ') + '. Match times and results are updated during the day.');
});
