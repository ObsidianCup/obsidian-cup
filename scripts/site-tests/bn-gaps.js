// Lists text that is still English when a page is shown in Bangla.
// Serve the site on localhost:8765 first. Usage: node bn-gaps.js [page ...]
// Team names, brand names, @handles and partner names are expected to stay English.
const { chromium } = require('playwright');
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/pages/volleyball.html', '/pages/futsal.html', '/pages/past-seasons.html', '/pages/about.html', '/pages/faq.html', '/pages/rules.html', '/pages/register.html', '/pages/experiences.html', '/pages/fixtures.html', '/404.html'];
(async () => {
  const b = await chromium.launch();
  for (const url of PAGES) {
    const c = await b.newContext({ viewport: { width: 1280, height: 900 } });
    await c.addInitScript(() => localStorage.setItem('oc_lang', 'bn'));
    const p = await c.newPage();
    await p.goto('http://localhost:8765' + url, { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    const left = await p.evaluate(() => {
      const out = new Set();
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) {
        const t = walk.currentNode.textContent.replace(/\s+/g, ' ').trim();
        const el = walk.currentNode.parentElement;
        if (!t || !el || el.closest('script,style,noscript,[lang="en"]')) continue;
        if (/[ঀ-৿]/.test(t)) continue;          // has Bangla
        if (!/[a-z]{3,}.*\s.*[a-z]{2,}/i.test(t)) continue; // single names, numbers, handles
        out.add(t.slice(0, 120));
      }
      return [...out];
    });
    console.log('\n## ' + url + ' (' + left.length + ')\n' + left.map(s => '- ' + s).join('\n'));
    await c.close();
  }
  await b.close();
})();
