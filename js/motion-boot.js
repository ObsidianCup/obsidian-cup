// Motion mode for the public pages. Runs first, before the page is drawn.
//
//   "calm"  = short transitions only (the site as it was).
//   "showy" = the opening on each page, sections arriving as you scroll, the
//             moving background and page-to-page transitions.
//
// MOTION_DEFAULT is what every visitor gets. To look at the other mode without
// changing it for anyone else, open any page with ?motion=showy (or
// ?motion=calm) at the end of the address; the choice lasts until the tab is
// closed. Visitors who have "reduce motion" switched on always get calm.
(function () {
  var MOTION_DEFAULT = 'calm';

  var root = document.documentElement, mode = null;
  var asked = /[?&]motion=(showy|calm)\b/.exec(location.search);
  try {
    if (asked) sessionStorage.setItem('oc_motion', asked[1]);
    mode = sessionStorage.getItem('oc_motion');
  } catch (e) { mode = asked && asked[1]; }
  if ((mode || MOTION_DEFAULT) !== 'showy') return;
  if (!window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  root.classList.add('m-on');

  // Page-to-page transition (browsers that have it; the others just load the page).
  try {
    var sheet = new CSSStyleSheet();
    sheet.replaceSync(
      '@view-transition { navigation: auto; }' +
      '@keyframes m-vt-out { to { opacity: 0; transform: translateY(-8px); } }' +
      '@keyframes m-vt-in { from { opacity: 0; transform: translateY(12px); } }' +
      '::view-transition-old(root) { animation: 150ms cubic-bezier(0.7, 0, 0.84, 0) both m-vt-out; }' +
      '::view-transition-new(root) { animation: 300ms cubic-bezier(0.16, 1, 0.3, 1) both m-vt-in; }');
    document.adoptedStyleSheets = document.adoptedStyleSheets.concat(sheet);
  } catch (e) { /* older browser: no page transition */ }

  // Safety net: if the motion script never arrives, show the page as normal.
  setTimeout(function () { if (!root.classList.contains('m-ready')) root.classList.remove('m-on'); }, 3000);
})();
