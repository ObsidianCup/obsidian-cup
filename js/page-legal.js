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
      if (window.marked) body.replaceChildren(clean(marked.parse(md)));
      else { const pre = document.createElement('pre'); pre.style.whiteSpace = 'pre-wrap'; pre.textContent = md; body.replaceChildren(pre); }
      shape(body);
    } catch (e) {
      $('legalTitle').textContent = t('legalNotFound');
      body.innerHTML = '';
      $('legalTocWrap').hidden = true;
    }
  }

  // The documents are our own files, but nothing they contain may ever run:
  // keep plain text formatting only, drop everything else (scripts, frames,
  // forms, event handlers, links that are not ordinary web or email links).
  const KEEP = new Set(['P', 'BR', 'HR', 'STRONG', 'EM', 'B', 'I', 'DEL', 'CODE', 'PRE', 'BLOCKQUOTE', 'UL', 'OL', 'LI',
    'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A']);
  const DROP_WHOLE = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'FORM', 'SVG', 'MATH', 'LINK', 'META', 'BASE']);
  function clean(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');   // parsed, never run
    const out = document.createDocumentFragment();
    const copy = (from, to) => {
      from.childNodes.forEach(n => {
        if (n.nodeType === 3) { to.appendChild(document.createTextNode(n.nodeValue)); return; }
        if (n.nodeType !== 1) return;
        const tag = n.tagName.toUpperCase();
        if (DROP_WHOLE.has(tag)) return;
        if (tag === 'INPUT') {                                   // "- [ ]" lines: a tick box that only shows, never sends
          if ((n.getAttribute('type') || '').toLowerCase() !== 'checkbox') return;
          const box = document.createElement('input');
          box.type = 'checkbox'; box.disabled = true; box.checked = n.hasAttribute('checked');
          to.appendChild(box); return;
        }
        if (!KEEP.has(tag)) { copy(n, to); return; }            // unknown tag: keep its words only
        const el = document.createElement(tag);
        if (tag === 'A') {
          const href = (n.getAttribute('href') || '').trim();
          if (/^(https:\/\/|mailto:|#|\/(?!\/)|[a-z0-9._-]+\.html)/i.test(href)) el.setAttribute('href', href);
          if (/^https:\/\//i.test(href)) el.setAttribute('rel', 'noopener noreferrer');
        }
        if ((tag === 'TH' || tag === 'TD') && /^(left|right|center)$/.test(n.getAttribute('align') || '')) el.style.textAlign = n.getAttribute('align');
        copy(n, el);
        to.appendChild(el);
      });
    };
    copy(doc.body, out);
    return out;
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
  document.addEventListener('DOMContentLoaded', () => ocStickyFit(document.querySelector('.legal-toc'), 96));
  document.addEventListener('oc:language', render);
})();
