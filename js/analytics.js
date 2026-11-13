// Visitor counting with Google Analytics. OFF unless SITE_CONFIG.analyticsEnabled
// is true (js/config.js). While it is off the site sets no cookies and sends
// nothing to Google, so there is nothing to ask visitors' permission for.
// Never runs on account, organiser or legal pages (they do not load this file).
document.addEventListener('DOMContentLoaded', function () {
  if (typeof SITE_CONFIG === 'undefined' || !SITE_CONFIG.analyticsEnabled || !SITE_CONFIG.analyticsId) return;
  if (navigator.globalPrivacyControl || navigator.doNotTrack === '1') return;   // the visitor's browser says no
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', SITE_CONFIG.analyticsId);
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(SITE_CONFIG.analyticsId);
  document.head.appendChild(s);
});
