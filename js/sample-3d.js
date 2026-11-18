// SAMPLE ONLY (not live): "Glimpse of us" as 3D photo cards.
// The row scrolls and swipes like normal; this script turns each card by how
// far it is from the middle, on every frame while the row moves. The card in
// the middle is flat and bright, the others turn away and sink back. It also
// moves to the next photo every 4 seconds (waits 8 seconds after a manual
// move), and tilts the front card a little under the mouse.
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
    var tiltX = 0, tiltY = 0;   // mouse tilt on the front card, in degrees

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
      var w = slides[0].offsetWidth || 1;
      slides.forEach(function (s, i) {
        var d = (slideCentre(s) - c) / w;
        var a = Math.min(Math.abs(d), 4);
        // load the photos next in line early, so no card arrives empty
        if (a < 3.5 && photos[i] && photos[i].loading === 'lazy') photos[i].loading = 'eager';
        if (calm) return;
        if (a > 2.6) { s.style.visibility = 'hidden'; return; }
        s.style.visibility = '';
        var sign = d < 0 ? -1 : 1;
        var turn = -sign * Math.min(a, 1) * 42 - sign * Math.max(a - 1, 0) * 8;    // degrees
        var back = a * 260;                                                       // px into the screen
        var pull = -sign * (Math.min(a, 1) * 0.30 + Math.max(a - 1, 0) * 0.42) * w; // closer to the middle
        var front = Math.max(0, 1 - a);                                           // 1 only for the card in front
        var rx = tiltX * front, ry = tiltY * front;
        s.style.transform = 'translateX(' + pull.toFixed(1) + 'px) translateZ(' + (-back).toFixed(1) + 'px) rotateY(' + (turn + ry).toFixed(2) + 'deg) rotateX(' + rx.toFixed(2) + 'deg)';
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

    // Mouse tilt on the front card (mouse only, not touch).
    if (!calm) {
      track.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        var s = slides[index];
        if (!s) return;
        var r = s.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        if (Math.abs(x) > 0.6 || Math.abs(y) > 0.6) { x = 0; y = 0; }
        tiltY = x * 10; tiltX = -y * 8;
        queue();
      });
      track.addEventListener('pointerleave', function () { tiltX = 0; tiltY = 0; queue(); });
    }

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
