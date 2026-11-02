// Page script for pages/legal.html (no inline scripts: the site's security policy blocks them).
// Shows one legal document: legal.html?doc=terms (privacy, media).
// Only documents that matter for having an account are listed here. Tournament
// documents (participation, payment, guardian, captain_code, captain_declaration)
// are shown inside team registration when that is built, to the people they apply to.
(function () {
  const DOCS = ['terms', 'privacy', 'media'];
  const VERSIONS = OC_LEGAL;
  const AVAILABLE = { en: DOCS, bn: [] };   // add keys to bn as Bangla versions are published
  // Short names for the document switcher (the full title comes from the document itself).
  const SHORT = {
    terms: ['Terms of use', 'ব্যবহারের শর্তাবলি'], privacy: ['Privacy', 'গোপনীয়তা'], media: ['Media consent', 'মিডিয়া সম্মতি'],
  };
  const $ = id => document.getElementById(id);
  const slug = (s, i) => 'sec-' + (i + 1) + '-' + s.toLowerCase().replace(/[^a-z0-9ঀ-৿]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  async function render() {
    ocApplyText();
    const asked = new URLSearchParams(location.search).get('doc');
    const doc = DOCS.includes(asked) ? asked : 'terms';
    const body = $('legalBody');
    const bn = ocLang() === 'bn';
    $('legalDocs').innerHTML = DOCS.map(d =>
      `<a href="legal.html?doc=${d}"${d === doc ? ' aria-current="page"' : ''}>${ocEscape(SHORT[d][bn ? 1 : 0])}</a>`).join('');
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
    // Documents written as one numbered list have no headings: use each item's bold lead-in.
    const items = heads.length >= 3 ? heads.map(h => ({ el: h, label: h.textContent })) :
      Array.from(body.querySelectorAll(':scope > ol > li')).map(li => ({ el: li, lead: li.firstElementChild }))
        .filter(x => x.lead && x.lead.matches('strong'))
        .map(x => ({ el: x.el, label: x.lead.textContent.trim().replace(/[.:]$/, '') }));
    items.forEach((x, i) => { if (!x.el.id) x.el.id = slug(x.label, i); });
    $('legalToc').innerHTML = items.map(x => `<li><a href="#${x.el.id}">${ocEscape(x.label)}</a></li>`).join('');
    $('legalTocWrap').hidden = items.length < 3;
    $('legalLayout').classList.toggle('legal-layout-toc', items.length >= 3);
    if (window.matchMedia('(max-width: 960px)').matches) $('legalTocBox').open = false;

    // A tick box inside a document is only a picture of the real choice in the profile.
    body.querySelectorAll('input[type="checkbox"]').forEach(box => {
      box.setAttribute('aria-label', box.parentElement.textContent.trim());
    });

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
