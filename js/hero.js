// Home page: the opening photo moves slower than the words while you scroll.
// Sets --hp on the opening section, a number from 0 to 1:
//   Cinema (.hd): 0 at the top of the page, 1 when the opening has scrolled away.
// Only in the showy mode; nothing moves in the calm mode or under reduced motion.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var hero = document.querySelector('.g-hero-full');
    if (!hero) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!document.documentElement.classList.contains('m-on')) return;
    var queued = false;

    function paint() {
      queued = false;
      var p = Math.max(0, Math.min(1, window.scrollY / Math.max(1, hero.offsetHeight)));
      hero.style.setProperty('--hp', p.toFixed(4));
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    paint();
  });
})();
