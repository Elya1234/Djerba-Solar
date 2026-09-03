/**
 * GOLD MINES — Fetches Shopify's native product recommendations
 * (routes.product_recommendations_url) and swaps in the server-rendered
 * section markup. Real Shopify data only — no invented "you may like".
 */
(function () {
  'use strict';
  document.querySelectorAll('[data-gm-recommendations]').forEach(function (el) {
    var url = el.getAttribute('data-url');
    if (!url) return;
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var newEl = doc.querySelector('[data-gm-recommendations]');
        if (newEl && newEl.innerHTML.trim()) {
          el.innerHTML = newEl.innerHTML;
        } else {
          el.remove();
        }
      })
      .catch(function () {});
  });
})();
