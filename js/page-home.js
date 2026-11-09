// Home page: sport tabs (Volleyball / Futsal) and account-only sections.
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    if (window.SITE_CONFIG && SITE_CONFIG.accountsEnabled) {
      document.querySelectorAll('[data-needs-accounts]').forEach(el => { el.hidden = false; });
    }

    const list = document.querySelector('.g-tabs');
    if (!list) return;
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const bar = list.querySelector('.g-tabbar');
    const place = (tab) => {   // the underline slides under the chosen tab
      bar.style.width = tab.offsetWidth + 'px';
      bar.style.transform = 'translateX(' + tab.offsetLeft + 'px)';
    };
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      place(tab);
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {   // arrow keys move between tabs
        let j = null;
        if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
    const current = () => tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
    place(current());
    // Text width changes with the language and the fonts loading.
    document.addEventListener('oc:site-language', () => place(current()));
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => place(current()));
    window.addEventListener('resize', () => place(current()));
  });
})();
