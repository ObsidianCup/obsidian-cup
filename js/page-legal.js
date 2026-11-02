// Page script for pages/legal.html (no inline scripts: the site's security policy blocks them).
// Shows one legal document: legal.html?doc=terms (privacy, media, participation, payment, guardian, captain_code, captain_declaration)
(function () {
  const DOCS = ['terms', 'privacy', 'media', 'participation', 'payment', 'guardian', 'captain_code', 'captain_declaration'];
  const VERSIONS = Object.assign({ participation: '1.0', payment: '1.0', guardian: '1.0', captain_code: '1.0', captain_declaration: '1.0' }, OC_LEGAL);
  const AVAILABLE = { en: DOCS, bn: [] };   // add keys to bn as Bangla versions are published
  // Short names for the document switcher (the full title comes from the document itself).
  const SHORT = {
    terms: ['Terms of use', 'ব্যবহারের শর্তাবলি'], privacy: ['Privacy', 'গোপনীয়তা'], media: ['Media consent', 'মিডিয়া সম্মতি'],
    participation: ['Event agreement', 'ইভেন্ট সম্মতিপত্র'], payment: ['Payments and refunds', 'পেমেন্ট ও টাকা ফেরত'],
    guardian: ['Guardian consent', 'অভিভাবকের সম্মতি'], captain_code: ['Captain code', 'অধিনায়ক কোড'], captain_declaration: ['Captain declaration', 'অধিনায়কের ঘোষণা'],
  };
  const $ = id => document.getElementById(id);
  const slug = (s, i) => 'sec-' + (i + 1) + '-' + s.toLowerCase().replace(/[^a-z0-9ঀ-৿]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  async function render() {
    ocApplyText();
    const doc = new URLSearchParams(location.search).get('doc') || 'terms';
    const body = $('legalBody');
    const bn = ocLang() === 'bn';
    $('legalDocs').innerHTML = DOCS.map(d =>
      `<a href="legal.html?doc=${d}"${d === doc ? ' aria-current="page"' : ''}>${ocEscape(SHORT[d][bn ? 1 : 0])}</a>`).join('');
    if (!DOCS.includes(doc)) { $('legalTitle').textContent = t('legalNotFound'); body.innerHTML = ''; return; }
    const want = ocLang();
    const lang = AVAILABLE[want].includes(doc) ? want : 'en';
    $('legalNote').innerHTML = want !== lang ? `<p class="acct-msg acct-msg-info">${ocEscape(t('legalNoTranslation'))}</p>` : '';
    $('legalVersion').textContent = t('legalVersion', { version: VERSIONS[doc] });
    try {
      const res = await fetch(`/legal/${lang}/${doc}-${VERSIONS[doc]}.md`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      const md = await res.text();
      body.innerHTML = window.marked ? marked.parse(md) : `<pre style="white-space:pre-wrap">${ocEscape(md)}</pre>`;
      shape(body);
    } catch (e) {
      $('legalTitle').textContent = t('legalNotFound');
      body.innerHTML = '';
      $('legalTocWrap').hidden = true;
    }
  }

  // Turn the plain document into a readable page: title on top, bold-only
  // paragraphs into real headings with a contents list, and tables that can
  // be read as stacked cards on a phone.
  function shape(body) {
    const first = body.firstElementChild;
    const strong = first && first.matches('p') && first.children.length === 1 && first.firstElementChild.matches('strong') ? first.firstElementChild : null;
    if (strong) {
      const name = strong.textContent.replace(/\s*—\s*version.*$/i, '');
      $('legalTitle').textContent = name;
      document.title = 'Obsidian Cup | ' + name.replace(/^Obsidian Cup /, '');
      first.remove();
    }
    const heads = [];
    body.querySelectorAll('p').forEach(p => {
      const only = p.children.length === 1 && p.firstElementChild.matches('strong') && p.textContent.trim() === p.firstElementChild.textContent.trim();
      if (!only) return;
      const h = document.createElement('h2');
      h.textContent = p.textContent.trim().replace(/:$/, '');
      p.replaceWith(h);
      heads.push(h);
    });
    heads.forEach((h, i) => { h.id = slug(h.textContent, i); });
    $('legalToc').innerHTML = heads.map(h => `<li><a href="#${h.id}">${ocEscape(h.textContent)}</a></li>`).join('');
    $('legalTocWrap').hidden = heads.length < 3;
    if (window.matchMedia('(max-width: 960px)').matches) $('legalTocBox').open = false;

    body.querySelectorAll('table').forEach(tbl => {
      const labels = Array.from(tbl.querySelectorAll('thead th')).map(th => th.textContent.trim());
      tbl.querySelectorAll('tbody tr').forEach(tr => Array.from(tr.children).forEach((td, i) => td.setAttribute('data-label', labels[i] || '')));
      tbl.classList.add('legal-table');
      const wrap = document.createElement('div');
      wrap.className = 'legal-table-wrap';
      tbl.replaceWith(wrap);
      wrap.appendChild(tbl);
    });
  }

  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('oc:language', render);
})();
