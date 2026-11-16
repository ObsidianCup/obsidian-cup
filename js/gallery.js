// Home page photo slideshow. The photos sit in a row that can be swiped or
// scrolled sideways; this adds the arrows, the counter and the automatic
// change every few seconds. Without this script the row still works by hand.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var track = document.querySelector('.g-gallery-track');
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    var count = document.getElementById('galleryCount');
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var EVERY = 4000, REST = 8000;      // change every 4 seconds; after someone moves it by hand, wait 8 seconds
    var index = 0, onScreen = false, held = false, restUntil = 0;

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

    function rest() { restUntil = Date.now() + REST; }
    function tick() {
      if (!calm && onScreen && !held && !document.hidden && Date.now() >= restUntil) go(index + 1);
    }

    // Arrows and keyboard. When someone moves it by hand, the automatic
    // change waits a little so it never fights them.
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

    show();
    setInterval(tick, EVERY);
  });
})();
