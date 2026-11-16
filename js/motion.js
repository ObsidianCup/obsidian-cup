// "Showy" motion for the public pages. Does nothing unless js/motion-boot.js
// switched it on (class m-on on <html>). Styles: css/motion.css.
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('m-on')) return;

  var REVEAL_MS = 600, STEP_MS = 60, MAX_STEPS = 7;
  // Weak phones and data-saving visitors keep the arriving sections but not
  // the background that follows the scroll.
  var conn = navigator.connection || {};
  var lite = !!conn.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2) || window.innerWidth < 700;

  function start() {
    try {
      facets();
      reveals();
      arc();
      root.classList.add('m-ready');
    } catch (e) {
      root.classList.remove('m-on');      // anything unexpected: plain page
    }
  }

  // ---------- Sections arrive as they scroll into view ----------
  var LISTS = 'ul, ol, .g-champs, .g-steps';
  var OPEN = 'section, article, .g-wrap, .g-about-body, .g-band-inner';
  var SKIP = '.g-pagehead, .g-hero2, .m-arc, script, style, template';

  function collect(el, depth, out) {
    Array.prototype.forEach.call(el.children, function (c) {
      if (c.hidden || c.matches(SKIP)) return;
      var n = c.children.length;
      if (c.matches(LISTS) && n >= 2 && n <= 16) out.push({ el: c, items: Array.prototype.slice.call(c.children) });
      else if (depth < 4 && n >= 1 && c.matches(OPEN)) collect(c, depth + 1, out);
      else out.push({ el: c });
    });
  }

  function reveals() {
    var main = document.querySelector('main');
    if (!main) return;
    var units = [];
    collect(main, 0, units);
    var fold = window.innerHeight * 0.92, waiting = [];

    units.forEach(function (u) {
      if (u.el.getBoundingClientRect().top < fold) return;        // already on screen: leave it alone
      (u.items || [u.el]).forEach(function (el, i) {
        el.setAttribute('data-m', '');
        if (u.items) el.style.setProperty('--i', Math.min(i, MAX_STEPS));
      });
      waiting.push(u);
    });
    if (!waiting.length) return;

    function show(u) {
      if (u.done) return;
      u.done = true;
      var els = u.items || [u.el];
      els.forEach(function (el) { el.classList.add('m-in'); });
      // afterwards the element is exactly as it was before (its own hover styles work again)
      setTimeout(function () {
        els.forEach(function (el) { el.removeAttribute('data-m'); el.classList.remove('m-in'); el.style.removeProperty('--i'); });
      }, REVEAL_MS + MAX_STEPS * STEP_MS + 100);
    }
    function showAll() { waiting.forEach(show); }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        waiting.forEach(function (u) { if (u.el === en.target) show(u); });
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    waiting.forEach(function (u) { io.observe(u.el); });

    // Nothing may stay hidden: keyboard focus, the end of the page, printing.
    document.addEventListener('focusin', function (e) {
      waiting.forEach(function (u) { if (!u.done && u.el.contains(e.target)) show(u); });
    });
    window.addEventListener('scroll', function () {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) showAll();
    }, { passive: true });
    window.addEventListener('beforeprint', showAll);
  }

  // ---------- Background facets and the progress line ----------
  function facets() {
    var NS = 'http://www.w3.org/2000/svg';
    var shapes = [
      { l: 58, t: -10, w: 52, h: 70, p: '0,20 100,0 80,100 30,70', r: 0.05, k: 10 },
      { l: -12, t: 35, w: 40, h: 60, p: '0,0 100,30 60,100 10,80', r: -0.035, k: -14 },
      { l: 55, t: 62, w: 50, h: 55, p: '20,0 100,25 90,100 0,80', r: 0.08, k: 18 },
      { l: 8, t: -8, w: 26, h: 34, p: '0,30 70,0 100,60 40,100', r: -0.06, k: -8 },
      { l: 30, t: 22, w: 36, h: 70, p: '50,0 100,50 50,100 0,45', r: 0.025, k: 6 }
    ];
    var layer = document.createElement('div');
    layer.className = 'm-facets';
    layer.setAttribute('aria-hidden', 'true');
    var parts = shapes.map(function (s) {
      var svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'm-facet');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.style.left = s.l + 'vw'; svg.style.top = s.t + 'vh'; svg.style.width = s.w + 'vw'; svg.style.height = s.h + 'vh';
      var poly = document.createElementNS(NS, 'polygon');
      poly.setAttribute('points', s.p);
      svg.appendChild(poly);
      layer.appendChild(svg);
      return { el: svg, r: s.r, k: s.k };
    });
    document.body.insertBefore(layer, document.body.firstChild);

    var bar = null;
    if (document.documentElement.scrollHeight > window.innerHeight * 1.8) {
      bar = document.createElement('div');
      bar.className = 'm-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }

    var px = 0, py = 0, queued = false;
    function frame() {
      queued = false;
      var y = window.scrollY;
      if (!lite) parts.forEach(function (f) {
        f.el.style.transform = 'translate3d(' + (px * f.k).toFixed(1) + 'px,' + (-y * f.r + py * f.k).toFixed(1) + 'px,0)';
      });
      if (bar) {
        var room = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (room > 0 ? Math.min(1, y / room) : 0).toFixed(4) + ')';
      }
    }
    function ask() { if (!queued) { queued = true; requestAnimationFrame(frame); } }
    if (!lite || bar) window.addEventListener('scroll', ask, { passive: true });
    if (!lite && window.matchMedia('(pointer: fine)').matches) {
      layer.classList.add('m-smooth');
      window.addEventListener('pointermove', function (e) {
        px = e.clientX / window.innerWidth - 0.5;
        py = e.clientY / window.innerHeight - 0.5;
        ask();
      }, { passive: true });
    }
    frame();
  }

  // ---------- Home: the ball that lands on "Next up" ----------
  function arc() {
    var hero = document.querySelector('.g-hero2');
    var tag = hero && hero.querySelector('.g-nextup');
    if (!tag) return;
    var NS = 'http://www.w3.org/2000/svg';
    var wrap = document.createElement('div');
    wrap.className = 'm-arc';
    wrap.setAttribute('aria-hidden', 'true');
    var svg = document.createElementNS(NS, 'svg');
    var line = document.createElementNS(NS, 'path');
    line.setAttribute('class', 'm-arc-line');
    svg.appendChild(line);
    wrap.appendChild(svg);
    var canFly = window.CSS && CSS.supports && CSS.supports('offset-path', 'path("M0 0 L1 1")');
    var ball = document.createElement('div');
    ball.className = 'm-ball';
    if (canFly) wrap.appendChild(ball);
    hero.appendChild(wrap);
    tag.classList.add('m-wait');

    function shape() {
      var h = hero.getBoundingClientRect(), t = tag.getBoundingClientRect();
      var ex = t.left - h.left + 4, ey = t.top - h.top + t.height / 2, W = h.width;
      // wide screens: in from the left, over the headline; narrow: a low lob in from the right, above the card
      return ex > W * 0.4
        ? 'M -24 ' + Math.round(Math.min(72, ey * 0.4)) + ' Q ' + Math.round(W * 0.42) + ' -96 ' + ex.toFixed(1) + ' ' + ey.toFixed(1)
        : 'M ' + Math.round(W + 14) + ' ' + Math.round(ey - 46) + ' Q ' + Math.round(W * 0.5) + ' ' + Math.round(ey - 70) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1);
    }
    function place() {
      var d = shape();
      line.setAttribute('d', d);
      ball.style.offsetPath = 'path("' + d + '")';
    }

    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(function () {
      setTimeout(function () {
        place();
        var len = line.getTotalLength();
        line.style.strokeDasharray = len;
        line.style.strokeDashoffset = len;
        line.getBoundingClientRect();                 // take the start position before moving
        line.classList.add('m-go');
        line.style.strokeDashoffset = 0;
        ball.classList.add('m-go');
        setTimeout(function () {
          ball.remove();
          tag.classList.remove('m-wait');
          tag.classList.add('m-land');
          line.style.strokeDasharray = 'none';
          line.classList.remove('m-go');
          line.classList.add('m-rest');
          if (window.ResizeObserver) new ResizeObserver(place).observe(hero);
        }, 620);
      }, 520);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
