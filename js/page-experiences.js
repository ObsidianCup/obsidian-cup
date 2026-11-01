// Page script for pages/experiences.html (no inline scripts: the site's security policy blocks them).
document.addEventListener('DOMContentLoaded', () => {
  // The three player quotes stay hidden until the organiser confirms they are real.
  const quotes = document.getElementById('playerQuotes');
  if (quotes && SITE_CONFIG.showPlayerQuotes) quotes.hidden = false;

  const form = document.getElementById('expForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const textarea = $('expMessage');
  const count = $('charCount');
  const setErr = (id, text) => { const el = $(id + 'Err'); if (el) el.textContent = text || ''; $(id).setAttribute('aria-invalid', text ? 'true' : 'false'); };

  const bnDigits = n => String(n).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const showCount = () => {
    const len = textarea.value.trim().length;
    count.textContent = document.documentElement.lang === 'bn'
      ? `${bnDigits(len)} / সর্বনিম্ন ২০টি অক্ষর`
      : `${len} / 20 minimum`;
    return len;
  };
  textarea.addEventListener('input', () => { if (showCount() >= 20) setErr('expMessage', ''); });
  document.addEventListener('oc:site-language', showCount);
  showCount();
  $('expEmail').addEventListener('blur', () => {
    const v = $('expEmail').value.trim();
    setErr('expEmail', v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Check the email address, for example name@gmail.com.' : '');
  });
  $('expTourney').addEventListener('change', () => setErr('expTourney', ''));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('expName').value.trim();
    const email = $('expEmail').value.trim();
    const tourney = $('expTourney').value;
    const message = textarea.value.trim();
    let ok = true;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('expEmail', 'Check the email address, for example name@gmail.com.'); ok = false; }
    if (!tourney) { setErr('expTourney', 'Choose the tournament you were at.'); ok = false; }
    if (message.length < 20) { setErr('expMessage', 'Write at least 20 characters so we know what it was like.'); ok = false; }
    if (!ok) return;
    const to = SITE_CONFIG.contactEmail;
    const subject = `Player story: ${tourney}`;
    const body = `${message}\n\nName: ${name || 'Not given'}\nEmail: ${email || 'Not given'}\nTournament: ${tourney}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('expDone').innerHTML = '';
    const p = document.createElement('p');
    p.className = 'g-note';
    p.textContent = `Your email app should open with the message ready. If it does not, email it to ${to}.`;
    $('expDone').appendChild(p);
  });
});
