// SAMPLE ONLY (not live): moves the opening photo with the scroll.
// Sets --hp on the opening section, a number from 0 to 1:
//   Cinema (.hd): 0 at the top of the page, 1 when the opening has scrolled away.
//   Card (.he):   the same; the photo drifts inside its card.
// Nothing moves under reduced motion.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var hero = document.querySelector('.g-hero-full');
    if (!hero) return;
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var card = null;   // both: 0 at the top of the page, 1 once the opening has scrolled away
    var queued = false;

    function paint() {
      queued = false;
      var p;
      if (card) {
        var r = card.getBoundingClientRect(), vh = window.innerHeight;
        // start coming forward when the card's top is low on the screen; fully forward by 45% of the screen
        p = (vh * 0.95 - r.top) / (vh * 0.5);
      } else {
        p = window.scrollY / Math.max(1, hero.offsetHeight);
      }
      p = Math.max(0, Math.min(1, p));
      hero.style.setProperty('--hp', p.toFixed(4));
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(paint); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    paint();
  });
})();
