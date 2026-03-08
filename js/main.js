/* ============================================
   OBSIDIAN CUP — Main JavaScript
   ============================================ */

// ---- Hero Cinematic Entrance ----
function heroEntrance() {
  const curtain  = document.getElementById('heroCurtain');
  const badge    = document.getElementById('heroBadge');
  const title    = document.getElementById('heroTitle');
  const tagline  = document.getElementById('heroTagline');
  const rule     = document.getElementById('heroRule');
  const meta     = document.getElementById('heroMeta');
  const topMeta  = document.getElementById('heroTopMeta');
  const corners  = document.querySelectorAll('.hero-corner');

  if (!curtain) return;

  const at = (fn, ms) => setTimeout(fn, ms);

  at(() => curtain.classList.add('lifted'),           80);
  at(() => badge   && badge.classList.add('visible'), 500);
  at(() => title   && title.classList.add('revealed'), 780);
  at(() => tagline && tagline.classList.add('visible'), 1100);
  at(() => rule    && rule.classList.add('expanded'),  1150);
  at(() => meta    && meta.classList.add('visible'),   1300);
  at(() => topMeta && topMeta.classList.add('visible'), 1300);
  at(() => corners.forEach(c => c.classList.add('visible')), 1450);
}

document.addEventListener('DOMContentLoaded', () => {
  heroEntrance();

  // ---- Cursor glow (desktop only) ----
  if (window.matchMedia('(hover: hover)').matches) {
    const glow = document.createElement('div');
    glow.classList.add('cursor-glow');
    document.body.appendChild(glow);
    let cx = -500, cy = -500;
    document.addEventListener('mousemove', (e) => {
      cx = e.clientX;
      cy = e.clientY;
      glow.style.left = cx + 'px';
      glow.style.top = cy + 'px';
    });
  }

  // ---- Floating particles ----
  function spawnParticle() {
    const p = document.createElement('div');
    p.classList.add('particle');
    const size = 1 + Math.random() * 2;
    const driftX = (Math.random() - 0.5) * 60; // random left or right
    p.style.cssText = `
      left: ${Math.random() * 100}vw;
      bottom: -10px;
      width: ${size}px;
      height: ${size}px;
      animation-duration: ${14 + Math.random() * 18}s;
      animation-delay: ${Math.random() * 3}s;
      opacity: ${0.08 + Math.random() * 0.15};
      --drift-x: ${driftX}px;
    `;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 38000);
  }

  // Spawn particles gradually
  for (let i = 0; i < 12; i++) {
    setTimeout(spawnParticle, i * 800);
  }
  setInterval(spawnParticle, 3000);

  // ---- Navbar scroll effect ----
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // ---- Active nav link ----
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ---- Mobile menu ----
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileClose = document.querySelector('.mobile-close');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  if (mobileClose && mobileMenu) {
    mobileClose.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ---- Spawn CSS sparkles ----
  function createSparkle(container, x, y, size) {
    const s = document.createElement('div');
    s.classList.add('sparkle');
    s.style.cssText = `
      left: ${x}%;
      top: ${y}%;
      width: ${size}px;
      height: ${size}px;
      animation: twinkle ${2 + Math.random() * 3}s ease-in-out infinite;
      animation-delay: ${Math.random() * 4}s;
    `;
    container.appendChild(s);
  }

  const heroSection = document.querySelector('.hero');
  if (heroSection) {
    const positions = [
      [8, 12], [88, 10], [5, 55], [93, 48],
      [12, 82], [85, 78], [42, 20], [60, 75]
    ];
    const sizes = [10, 14, 8, 12, 10, 16, 9, 11];
    positions.forEach(([x, y], i) => createSparkle(heroSection, x, y, sizes[i]));
  }

  // ---- Scroll reveal ----
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const parent = entry.target.closest('.paths-grid, .champions-grid, .partners-grid, .tournaments-grid, .experiences-grid');
        if (parent) {
          const siblings = [...parent.querySelectorAll('.reveal')];
          const idx = siblings.indexOf(entry.target);
          entry.target.style.transitionDelay = `${idx * 0.12}s`;
        }
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .reveal-fade, .reveal-left, .reveal-right').forEach(el => {
    observer.observe(el);
  });

  // ---- Back to top ----
  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('visible', window.scrollY > 400);
    });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---- Notify Me form ----
  const notifyForms = document.querySelectorAll('.notify-form');
  notifyForms.forEach(form => {
    const input = form.querySelector('.notify-input');
    const btn = form.querySelector('.btn-ghost');
    const successMsg = form.querySelector('.notify-success');

    if (btn && input) {
      btn.addEventListener('click', () => {
        const email = input.value.trim();
        if (!email || !email.includes('@')) {
          input.style.borderBottomColor = '#8b4444';
          setTimeout(() => { input.style.borderBottomColor = ''; }, 2000);
          return;
        }
        const emails = JSON.parse(localStorage.getItem('obsidian_notify') || '[]');
        if (!emails.includes(email)) emails.push(email);
        localStorage.setItem('obsidian_notify', JSON.stringify(emails));
        input.style.display = 'none';
        btn.style.display = 'none';
        if (successMsg) {
          successMsg.style.display = 'block';
          successMsg.style.opacity = '0';
          requestAnimationFrame(() => {
            successMsg.style.transition = 'opacity 0.5s ease';
            successMsg.style.opacity = '1';
          });
        }
      });
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btn.click();
      });
    }
  });

  // ---- Tournament Modal ----
  const modalOverlay = document.getElementById('tournamentModal');
  if (modalOverlay) {
    document.querySelectorAll('[data-tournament]').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.tournament;
        const data = TOURNAMENTS[id];
        if (!data) return;
        populateModal(data);
        modalOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeBtn = modalOverlay.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        m.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
  });

  // ---- Experience Modal ----
  const expModalOverlay = document.getElementById('experienceModal');
  const submitExpBtn = document.querySelector('.submit-exp-btn');

  if (expModalOverlay && submitExpBtn) {
    submitExpBtn.addEventListener('click', () => {
      expModalOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    const expClose = expModalOverlay.querySelector('.modal-close');
    if (expClose) {
      expClose.addEventListener('click', () => {
        expModalOverlay.classList.remove('open');
        document.body.style.overflow = '';
      });
    }

    expModalOverlay.addEventListener('click', (e) => {
      if (e.target === expModalOverlay) {
        expModalOverlay.classList.remove('open');
        document.body.style.overflow = '';
      }
    });

    const expForm = document.getElementById('expForm');
    if (expForm) {
      expForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = expForm.querySelector('#expName').value.trim();
        const email = expForm.querySelector('#expEmail').value.trim();
        const tourney = expForm.querySelector('#expTourney').value;
        const message = expForm.querySelector('#expMessage').value.trim();

        let valid = true;
        if (!name) { showError('expName', 'Please enter your name.'); valid = false; }
        if (!email || !email.includes('@')) { showError('expEmail', 'Please enter a valid email.'); valid = false; }
        if (!tourney) { showError('expTourney', 'Please select a tournament.'); valid = false; }
        if (!message || message.length < 20) { showError('expMessage', 'Please share a bit more (at least 20 characters).'); valid = false; }
        if (!valid) return;

        const submissions = JSON.parse(localStorage.getItem('obsidian_experiences') || '[]');
        submissions.push({ name, email, tourney, message, date: new Date().toISOString() });
        localStorage.setItem('obsidian_experiences', JSON.stringify(submissions));

        expForm.innerHTML = `
          <div style="text-align:center; padding: 2rem 0;">
            <div style="font-size:1.5rem; margin-bottom:1.5rem; color:var(--cream); font-family:var(--font-display);">— ✓ —</div>
            <p style="font-family:var(--font-display); font-style:italic; font-size:1.3rem; color:var(--cream); margin-bottom:1rem;">Thank you, ${name}.</p>
            <p style="font-size:0.75rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--silver-dim);">Your experience will be reviewed before publishing.</p>
          </div>
        `;
      });
    }
  }

  // ---- Rules checkbox ----
  const rulesCheckbox = document.getElementById('rulesCheck');
  const proceedBtn = document.querySelector('.btn-proceed');
  if (rulesCheckbox && proceedBtn) {
    rulesCheckbox.addEventListener('change', () => {
      proceedBtn.classList.toggle('enabled', rulesCheckbox.checked);
    });
  }

});

// ---- Tournament data ----
const TOURNAMENTS = {
  ovc_s1: {
    season: 'OVC — Season 1',
    name: 'Obsidian Volleyball Cup',
    type: 'Interschool',
    date: '11th & 12th January 2026',
    venue: 'DBox Sports Complex',
    venueAddress: 'Shagufta Housing, Mirpur 12, Dhaka',
    description: 'Our first tournament. An interschool competition that brought together the best young volleyball talent from across Dhaka. Boys competed in the interschool category. Girls competed in an open-age category. Two days, fierce competition, and the beginning of something that would grow beyond what we imagined.',
    results: [
      { category: 'Boys — Interschool', champion: 'Galactic Ganjas', runner: 'Nexhai' },
      { category: 'Girls — Open Age', champion: 'Pythons', runner: 'Panthers' },
    ]
  },
  ovasc_s1: {
    season: 'OVASC — Season 1',
    name: 'Obsidian Volleyball All Stars Cup',
    type: 'All Stars — Open Age',
    date: '6th & 7th February 2026',
    venue: 'Shaheed Noor Hossain National Volleyball Stadium',
    venueAddress: '23/1, Purana Paltan, Dhaka-1000',
    description: 'Our second tournament and our first time at the National Volleyball Stadium. The All Stars Cup is our open-age, no-restrictions lineup — the highest level of underground volleyball we host. Season 1 was boys only. Girls teams are welcome in future seasons.',
    results: [
      { category: 'Boys — Open Age', champion: 'Fearless Flyers', runner: 'Dhaka Colonisers' },
    ]
  }
};

// ---- Modal population ----
function populateModal(data) {
  const modal = document.getElementById('tournamentModal');
  if (!modal) return;

  modal.querySelector('.modal-season').textContent = data.season;
  modal.querySelector('.modal-title').textContent = data.name;

  const infoEl = modal.querySelector('.modal-info-block');
  if (infoEl) {
    infoEl.innerHTML = `
      <p class="modal-info"><span style="color:var(--silver-dim);font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;margin-right:1.2rem;display:inline-block;min-width:55px;">Type</span>${data.type}</p>
      <p class="modal-info" style="margin-top:0.6rem;"><span style="color:var(--silver-dim);font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;margin-right:1.2rem;display:inline-block;min-width:55px;">Date</span>${data.date}</p>
      <p class="modal-info" style="margin-top:0.6rem;"><span style="color:var(--silver-dim);font-size:0.62rem;letter-spacing:0.2em;text-transform:uppercase;margin-right:1.2rem;display:inline-block;min-width:55px;">Venue</span>${data.venue}, ${data.venueAddress}</p>
    `;
  }

  const descEl = modal.querySelector('.modal-description');
  if (descEl) descEl.textContent = data.description;

  const resultsEl = modal.querySelector('.modal-results-block');
  if (resultsEl) {
    resultsEl.innerHTML = data.results.map((r, i) => `
      ${i > 0 ? '<div class="modal-divider"></div>' : ''}
      <div class="modal-result">
        <div class="modal-result-category">${r.category}</div>
        <div class="modal-result-winner">${r.champion}</div>
        <div class="modal-result-runner">Runner-up &nbsp;·&nbsp; ${r.runner}</div>
      </div>
    `).join('');
  }
}

// ---- Show form error ----
function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.style.borderBottomColor = '#8b4444';
  let err = field.parentElement.querySelector('.form-error');
  if (!err) {
    err = document.createElement('span');
    err.classList.add('form-error');
    field.parentElement.appendChild(err);
  }
  err.textContent = message;
  err.style.display = 'block';
  field.addEventListener('input', () => {
    field.style.borderBottomColor = '';
    err.style.display = 'none';
  }, { once: true });
}
