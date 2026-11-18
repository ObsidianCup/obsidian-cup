// Home page: "Glimpse of us" as 3D photo cards (styles in css/home.css).
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
        // straight cards: the ones waiting stand further back, never tilted
        var back = Math.min(a, 1) * 420 + Math.max(a - 1, 0) * 260;
        var pull = -sign * Math.max(a - 1, 0) * 0.30 * w;
        s.style.transform = 'translateX(' + pull.toFixed(1) + 'px) translateZ(' + (-back).toFixed(1) + 'px)';
        s.style.opacity = (1 - Math.min(a, 2) * 0.36).toFixed(3);   // dimmer further away (opacity only: cheap to draw)
        s.style.zIndex = String(100 - Math.round(a * 10));
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

    // Move to a card with our own short, eased glide (the browser's own smooth
    // scroll is slow and uneven next to scroll snapping). Swipes stay native.
    var glide = 0;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }   // fast start, soft landing
    function go(i) {
      var n = (i + slides.length) % slides.length;
      var to = slideCentre(slides[n]) - track.clientWidth / 2;
      var from = track.scrollLeft, dist = to - from;
      if (calm || Math.abs(dist) < 1) { track.scrollLeft = to; return; }
      var steps = Math.abs(dist) / (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : 1);
      var time = Math.min(900, 420 + Math.max(0, steps - 1) * 40);   // one card: 0.42 s; back to the start: under 0.9 s
      var start = 0, id = ++glide;
      track.style.scrollSnapType = 'none';
      function step(now) {
        if (id !== glide) return;
        if (!start) start = now;
        var t = Math.min(1, (now - start) / time);
        track.scrollLeft = from + dist * ease(t);
        if (t < 1) requestAnimationFrame(step);
        else track.style.scrollSnapType = '';
      }
      requestAnimationFrame(step);
    }
    // a touch or wheel stops a glide at once and hands control back
    ['pointerdown', 'wheel', 'touchstart'].forEach(function (name) {
      track.addEventListener(name, function () { glide++; track.style.scrollSnapType = ''; }, { passive: true });
    });

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
