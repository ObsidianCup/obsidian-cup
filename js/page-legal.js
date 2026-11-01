// Page script for pages/legal.html (moved out of the HTML so inline scripts can be blocked).
// Shows one legal document: legal.html?doc=terms (privacy, media, participation, payment, guardian, captain_code, captain_declaration)
(function () {
  const DOCS = ['terms', 'privacy', 'media', 'participation', 'payment', 'guardian', 'captain_code', 'captain_declaration'];
  const VERSIONS = Object.assign({ participation: '1.0', payment: '1.0', guardian: '1.0', captain_code: '1.0', captain_declaration: '1.0' }, OC_LEGAL);
  const AVAILABLE = { en: DOCS, bn: [] };   // add keys to bn as Bangla versions are published

  async function render() {
    ocApplyText();
    const doc = new URLSearchParams(location.search).get('doc') || 'terms';
    const body = document.getElementById('legalBody');
    if (!DOCS.includes(doc)) { body.innerHTML = `<p>${ocEscape(t('legalNotFound'))}</p>`; return; }
    const want = ocLang();
    const lang = AVAILABLE[want].includes(doc) ? want : 'en';
    document.getElementById('legalNote').innerHTML = want !== lang ? `<p class="acct-msg acct-msg-info">${ocEscape(t('legalNoTranslation'))}</p>` : '';
    document.getElementById('legalVersion').textContent = t('legalVersion', { version: VERSIONS[doc] });
    try {
      const res = await fetch(`/legal/${lang}/${doc}-${VERSIONS[doc]}.md`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      const md = await res.text();
      body.innerHTML = window.marked ? marked.parse(md) : `<pre style="white-space:pre-wrap">${ocEscape(md)}</pre>`;
      const h = body.querySelector('p > strong');
      if (h) {
        const name = h.textContent.replace(/ — version.*/, '');
        document.title = 'Obsidian Cup | ' + name.replace(/^Obsidian Cup /, '');
        // The document's title line becomes the page's main heading (the version is shown above it).
        if (h.parentElement === body.firstElementChild) {
          const h1 = document.createElement('h1');
          h1.className = 'legal-title';
          h1.textContent = name;
          h.parentElement.replaceWith(h1);
        }
      }
    } catch (e) {
      body.innerHTML = `<p>${ocEscape(t('legalNotFound'))}</p>`;
    }
  }
  document.addEventListener('DOMContentLoaded', render);
  document.addEventListener('oc:language', render);
})();
