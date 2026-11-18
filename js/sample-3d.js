// SAMPLE ONLY (not live): "Glimpse of us" as 3D photo cards.
// The row scrolls and swipes like normal; this script turns each card by how
// far it is from the middle, on every frame while the row moves. The card in
// the middle is flat and bright, the others turn away and sink back. It also
// moves to the next photo every 4 seconds (waits 8 seconds after a manual
// move). Cards never tilt: the one in front is straight and centred, the
// others wait further back and come forward when their turn comes.
// Reduced motion: no 3D, no automatic change. Without this script the row
// still works by hand.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var box = document.querySelector('.g-gallery');
    var track = box && box.querySelector('.g-gallery-track');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    var photos = slides.map(function (s) { return s.querySelector('img'); });
    var count = document.getElementById('galleryCount');
    var caption = document.getElementById('galleryCaption');
    var line = box.querySelector('.g-gallery-time');
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var EVERY = 4000, REST = 8000;
    var index = -1, onScreen = false, held = false, restUntil = 0;
    var ANGLED = /[?&]angle=1/.test(location.search);

    if (!calm) box.classList.add('g3-on');

    function centre() { return track.scrollLeft + track.clientWidth / 2; }
    function slideCentre(s) { return s.offsetLeft + s.offsetWidth / 2; }

    function nearest() {
      var c = centre(), best = 0, gap = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(slideCentre(s) - c);
        if (d < gap) { gap = d; best = i; }
      });
      return best;
    }

    function show(i) {
      if (i === index) return;
      index = i;
      if (count) count.textContent = (index + 1) + ' / ' + slides.length;
      if (caption) caption.textContent = photos[index] ? photos[index].alt : '';
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === index); });
    }

    // Turn every card by its distance from the middle (d = 0 in front, 1 = one card away).
    function paint() {
      var c = centre();
      var w = (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : slides[0].offsetWidth) || 1;   // one step, card plus gap
      slides.forEach(function (s, i) {
        var d = (slideCentre(s) - c) / w;
        var a = Math.min(Math.abs(d), 4);
        // load the photos next in line early, so no card arrives empty
        if (a < 3.5 && photos[i] && photos[i].loading === 'lazy') photos[i].loading = 'eager';
        if (calm) return;
        if (a > 2.6) { s.style.visibility = 'hidden'; return; }
        s.style.visibility = '';
        var sign = d < 0 ? -1 : 1;
        var back, pull, turn = 0;
        if (ANGLED) {   // the earlier version: side cards turn away (only with ?angle=1)
          turn = -sign * Math.min(a, 1) * 42 - sign * Math.max(a - 1, 0) * 8;
          back = a * 260;
          pull = -sign * (Math.min(a, 1) * 0.30 + Math.max(a - 1, 0) * 0.42) * w;
        } else {        // straight cards: the ones waiting stand further back, never tilted
          back = Math.min(a, 1) * 420 + Math.max(a - 1, 0) * 260;
          pull = -sign * Math.max(a - 1, 0) * 0.30 * w;
        }
        s.style.transform = 'translateX(' + pull.toFixed(1) + 'px) translateZ(' + (-back).toFixed(1) + 'px)' + (turn ? ' rotateY(' + turn.toFixed(2) + 'deg)' : '');
        s.style.opacity = (1 - Math.min(a, 2) * 0.34).toFixed(3);
        s.style.zIndex = String(100 - Math.round(a * 10));
        s.style.filter = a > 0.02 ? 'brightness(' + (1 - Math.min(a, 1.5) * 0.4).toFixed(3) + ')' : '';
        // the photo slides a little inside its card while the row moves
        if (photos[i]) photos[i].style.transform = 'translateX(' + (-Math.max(-1, Math.min(1, d)) * 6).toFixed(2) + '%)';
      });
      show(nearest());
    }

    var queued = false;
    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; paint(); });
    }
    track.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);

    function go(i) {
      var n = (i + slides.length) % slides.length;
      var s = slides[n];
      track.scrollTo({ left: slideCentre(s) - track.clientWidth / 2, behavior: calm ? 'auto' : 'smooth' });
    }

    function restartLine() {
      if (!line) return;
      line.classList.remove('is-running');
      if (calm || !onScreen || held || Date.now() < restUntil) return;
      void line.offsetWidth;
      line.classList.add('is-running');
    }
    function rest() { restUntil = Date.now() + REST; if (line) line.classList.remove('is-running'); }
    function tick() {
      if (!calm && onScreen && !held && !document.hidden && Date.now() >= restUntil) go(index + 1);
      restartLine();
    }

    document.querySelectorAll('[data-gallery]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        rest();
        go(index + (btn.getAttribute('data-gallery') === 'next' ? 1 : -1));
      });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      rest();
      go(index + (e.key === 'ArrowRight' ? 1 : -1));
    });
    ['pointerdown', 'wheel', 'touchstart', 'touchmove'].forEach(function (name) {
      track.addEventListener(name, rest, { passive: true });
    });
    // Tap a card beside the front one to bring it to the middle.
    slides.forEach(function (s, i) {
      s.addEventListener('click', function () { if (i !== index) { rest(); go(i); } });
    });

    box.addEventListener('mouseenter', function () { held = true; if (line) line.classList.remove('is-running'); });
    box.addEventListener('mouseleave', function () { held = false; });
    box.addEventListener('focusin', function () { held = true; });
    box.addEventListener('focusout', function () { held = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; restartLine(); }, { threshold: 0.5 }).observe(track);
    } else { onScreen = true; }

    if (line) line.style.setProperty('--gallery-every', EVERY + 'ms');
    // start with the first photo in the middle
    track.scrollLeft = slideCentre(slides[0]) - track.clientWidth / 2;
    paint();
    setInterval(tick, EVERY);
  });
})();
