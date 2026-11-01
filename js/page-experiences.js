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

  const bn = () => document.documentElement.lang === 'bn';
  const MSG = {
    email: ['Check the email address, for example name@gmail.com.', 'ইমেইল ঠিকানাটি দেখে নিন, যেমন name@gmail.com।'],
    tourney: ['Choose the tournament you were at.', 'আপনি যে টুর্নামেন্টে ছিলেন, সেটি বেছে নিন।'],
    message: ['Write at least 20 characters so we know what it was like.', 'কমপক্ষে ২০টি অক্ষর লিখুন, যাতে আমরা আপনার অভিজ্ঞতাটা বুঝতে পারি।'],
    done: to => [`Your email app should open with the message ready. If it does not, email it to ${to}.`, `আপনার ইমেইল অ্যাপে বার্তাটি তৈরি অবস্থায় খোলার কথা। না খুললে ${to} ঠিকানায় ইমেইল করুন।`],
  };
  const say = m => m[bn() ? 1 : 0];
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
    setErr('expEmail', v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? say(MSG.email) : '');
  });
  $('expTourney').addEventListener('change', () => setErr('expTourney', ''));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('expName').value.trim();
    const email = $('expEmail').value.trim();
    const tourney = $('expTourney').value;
    const message = textarea.value.trim();
    let ok = true;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('expEmail', say(MSG.email)); ok = false; }
    if (!tourney) { setErr('expTourney', say(MSG.tourney)); ok = false; }
    if (message.length < 20) { setErr('expMessage', say(MSG.message)); ok = false; }
    if (!ok) return;
    const to = SITE_CONFIG.contactEmail;
    const subject = `Player story: ${tourney}`;
    const body = `${message}\n\nName: ${name || 'Not given'}\nEmail: ${email || 'Not given'}\nTournament: ${tourney}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('expDone').innerHTML = '';
    const p = document.createElement('p');
    p.className = 'g-note';
    p.textContent = say(MSG.done(to));
    $('expDone').appendChild(p);
  });
});
