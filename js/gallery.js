// Home page photo slideshow. The photos sit in a row that can be swiped or
// scrolled sideways; this adds the arrows, the pause button, the counter and
// the slow automatic change. Without this script the row still works by hand.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var track = document.querySelector('.g-gallery-track');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    var count = document.getElementById('galleryCount');
    var toggle = document.querySelector('[data-gallery="toggle"]');
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var EVERY = 5000;
    var index = 0, playing = !calm, onScreen = false, held = false, timer = null;

    function edge() { return parseFloat(getComputedStyle(track).paddingLeft) || 0; }

    function show() {
      if (count) count.textContent = (index + 1) + ' / ' + slides.length;
    }
    function nearest() {
      var at = track.scrollLeft + edge(), best = 0, gap = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(s.offsetLeft - at);
        if (d < gap) { gap = d; best = i; }
      });
      return best;
    }
    function go(i) {
      index = (i + slides.length) % slides.length;
      track.scrollTo({ left: slides[index].offsetLeft - edge(), behavior: calm ? 'auto' : 'smooth' });
      show();
    }

    function setPlaying(on) {
      playing = on;
      if (!toggle) return;
      var label = on ? 'Pause slideshow' : 'Play slideshow';
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('title', label);
      toggle.setAttribute('data-state', on ? 'playing' : 'paused');
    }
    function tick() {
      if (playing && onScreen && !held && !document.hidden) go(index + 1);
    }

    // Arrows, pause, keyboard. Once someone takes over by hand, the automatic
    // change stops until they press play.
    document.querySelectorAll('[data-gallery]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var what = btn.getAttribute('data-gallery');
        if (what === 'toggle') { setPlaying(!playing); return; }
        setPlaying(false);
        go(index + (what === 'next' ? 1 : -1));
      });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      setPlaying(false);
      go(index + (e.key === 'ArrowRight' ? 1 : -1));
    });
    ['pointerdown', 'wheel', 'touchstart'].forEach(function (name) {
      track.addEventListener(name, function () { setPlaying(false); }, { passive: true });
    });

    // Keep the counter right while the row is moved by hand.
    var queued = false;
    track.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; index = nearest(); show(); });
    }, { passive: true });

    // Wait while the pointer or the keyboard is on the slideshow, and while it is off screen.
    var box = track.closest('.g-gallery') || track;
    box.addEventListener('mouseenter', function () { held = true; });
    box.addEventListener('mouseleave', function () { held = false; });
    box.addEventListener('focusin', function () { held = true; });
    box.addEventListener('focusout', function () { held = false; });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; }, { threshold: 0.5 }).observe(track);
    } else { onScreen = true; }

    setPlaying(playing);
    show();
    timer = setInterval(tick, EVERY);
  });
})();
