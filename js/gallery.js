// Home page: "Glimpse of us" as a ring that goes round forever (owner approved 18 Nov 2026).
// The photos sit on a circle like a turning clothes rack seen from the front:
// the one in the middle is closest, the others go round to both sides and back.
// Every card stays straight (no tilt). One swipe, one arrow press or one
// trackpad swipe = one photo. It moves on by itself every 4 seconds and waits
// 8 seconds after someone moves it. Reduced motion: no gliding, it jumps.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var box = document.querySelector('.g-gallery');
    var track = box && box.querySelector('.g-gallery-track');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    var N = slides.length;
    var count = document.getElementById('galleryCount');
    var line = box.querySelector('.g-gallery-time');
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var EVERY = 4000, REST = 8000, STEP = 24 * Math.PI / 180;   // 24 degrees between photos
    var pos = 0, target = 0, onScreen = false, held = false, restUntil = 0, shown = -1;
    box.classList.add('g-ring-on');

    function wrap(d) { return ((d % N) + N + N / 2) % N - N / 2; }   // nearest way round, -N/2..N/2
    function cardW() { return slides[0].offsetWidth || 1; }

    function paint() {
      var w = cardW(), R = w * (window.innerWidth < 700 ? 2.3 : 3.1);
      slides.forEach(function (s, i) {
        var d = wrap(i - pos), a = Math.abs(d);
        var im = s.firstElementChild;   // load photos a few places ahead, so none arrives empty
        if (a < 5 && im && im.loading === 'lazy') im.loading = 'eager';
        if (a > 4.3) { s.style.visibility = 'hidden'; return; }
        s.style.visibility = '';
        var th = d * STEP;
        var x = Math.sin(th) * R, z = (Math.cos(th) - 1) * R * 2.4;
        s.style.transform = 'translate(-50%, -50%) translate3d(' + x.toFixed(1) + 'px, 0, ' + z.toFixed(1) + 'px)';
        s.style.opacity = Math.max(0, 1 - Math.max(0, a - 0.2) * 0.3).toFixed(3);
        s.style.zIndex = String(100 - Math.round(a * 10));
        s.classList.toggle('is-active', a < 0.5);
      });
      var now = ((Math.round(pos) % N) + N) % N;
      if (now !== shown) { shown = now; if (count) count.textContent = (now + 1) + ' / ' + N; }
    }

    // glide pos to a whole number (a photo in the middle)
    var glide = 0;
    function ease(t) { return 1 - Math.pow(1 - t, 3); }
    function go(to) {
      target = to;
      var from = pos, dist = to - from;
      if (calm || Math.abs(dist) < 0.001) { pos = to; paint(); return; }
      var time = Math.min(800, 420 + Math.max(0, Math.abs(dist) - 1) * 60);
      var start = 0, id = ++glide;
      requestAnimationFrame(function frame(now) {
        if (id !== glide) return;
        if (!start) start = now;
        var t = Math.min(1, (now - start) / time);
        pos = from + dist * ease(t); paint();
        if (t < 1) requestAnimationFrame(frame);
      });
    }
    function step(n) { go(Math.round(target) + n); }

    // touch: the ring follows the finger, then one swipe = one photo
    var sx = 0, sy = 0, sPos = 0, sTime = 0, axis = '';
    track.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; glide++; sx = t.clientX; sy = t.clientY; sPos = pos; sTime = Date.now(); axis = ''; rest();
    }, { passive: true });
    track.addEventListener('touchmove', function (e) {
      var t = e.touches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (!axis && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis !== 'x') return;
      e.preventDefault();
      pos = sPos - dx / (cardW() * 0.8); paint();
    }, { passive: false });
    function release(dx) {
      var quick = Math.abs(dx) / Math.max(1, Date.now() - sTime) > 0.3;
      var dir = (Math.abs(dx) > 40 || (quick && Math.abs(dx) > 12)) ? (dx < 0 ? 1 : -1) : 0;
      go(Math.round(sPos) + dir);
    }
    track.addEventListener('touchend', function (e) {
      if (axis !== 'x') return;
      release((e.changedTouches[0] ? e.changedTouches[0].clientX : sx) - sx);
    });
    track.addEventListener('touchcancel', function () { if (axis === 'x') go(Math.round(sPos)); });

    // laptops: one sideways trackpad swipe or shift + wheel = one photo
    var wheelLock = 0, wheelQuiet = 0;
    track.addEventListener('wheel', function (e) {
      var dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
      if (!dx) return;
      e.preventDefault(); rest();
      var now = Date.now(), fresh = now - wheelQuiet > 200; wheelQuiet = now;
      if ((!fresh && now < wheelLock) || Math.abs(dx) < 4) return;
      wheelLock = now + 650; step(dx > 0 ? 1 : -1);
    }, { passive: false });

    document.querySelectorAll('[data-gallery]').forEach(function (btn) {
      btn.addEventListener('click', function () { rest(); step(btn.getAttribute('data-gallery') === 'next' ? 1 : -1); });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault(); rest(); step(e.key === 'ArrowRight' ? 1 : -1);
    });
    // tap a photo at the side to bring it to the middle (the short way round)
    slides.forEach(function (s, i) {
      s.addEventListener('click', function () { var d = wrap(i - target); if (Math.abs(d) >= 0.5) { rest(); go(target + Math.round(d)); } });
    });

    function restartLine() {
      if (!line) return;
      line.classList.remove('is-running');
      if (calm || !onScreen || held || Date.now() < restUntil) return;
      void line.offsetWidth; line.classList.add('is-running');
    }
    function rest() { restUntil = Date.now() + REST; if (line) line.classList.remove('is-running'); }
    setInterval(function () {
      if (!calm && onScreen && !held && !document.hidden && Date.now() >= restUntil) step(1);
      restartLine();
    }, EVERY);
    box.addEventListener('mouseenter', function () { held = true; if (line) line.classList.remove('is-running'); });
    box.addEventListener('mouseleave', function () { held = false; });
    box.addEventListener('focusin', function () { held = true; });
    box.addEventListener('focusout', function () { held = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; restartLine(); }, { threshold: 0.5 }).observe(track);
    } else { onScreen = true; }
    if (line) line.style.setProperty('--gallery-every', EVERY + 'ms');
    window.addEventListener('resize', paint);
    paint();
  });
})();
