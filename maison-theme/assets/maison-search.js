/* =========================================================================
   MAISON — Recherche
   Panneau plein écran, suggestions en direct.
   Thème Shopify : Predictive Search API (/search/suggest.json).
   Aperçu autonome : window.MAISON_SEARCH_ADAPTER remplace uniquement la
   couche de données ; le rendu et le comportement restent identiques.
   ========================================================================= */
(function () {
  'use strict';

  var panel = document.querySelector('[data-search-panel]');
  if (!panel) return;

  var input = panel.querySelector('[data-search-input]');
  var results = panel.querySelector('[data-search-results]');
  var empty = panel.querySelector('[data-search-empty]');
  var initial = panel.querySelector('[data-search-initial]');
  var status = panel.querySelector('[data-search-status]');
  var searchUrl = panel.getAttribute('data-search-url') || '/search';

  var shopifyAdapter = {
    query: function (terms) {
      var url = '/search/suggest.json?q=' + encodeURIComponent(terms) +
        '&resources[type]=product,collection,page,article&resources[limit]=6';
      return fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (body) {
          var r = (body.resources && body.resources.results) || {};
          return {
            products: (r.products || []).map(function (p) {
              return {
                title: p.title,
                url: p.url,
                image: p.featured_image ? p.featured_image.url : '',
                meta: p.vendor || '',
                price: p.price ? formatFromString(p.price) : ''
              };
            }),
            collections: (r.collections || []).map(function (c) { return { title: c.title, url: c.url }; }),
            pages: (r.pages || []).concat(r.articles || []).map(function (p) { return { title: p.title, url: p.url }; })
          };
        });
    }
  };

  function formatFromString(value) {
    /* Predictive Search renvoie un prix déjà formaté ou en unités. */
    if (typeof value === 'string') return value;
    if (window.MaisonCart && window.MaisonCart.money) return window.MaisonCart.money(value);
    return value;
  }

  var adapter = window.MAISON_SEARCH_ADAPTER || shopifyAdapter;

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function linkAttrs(url) {
    /* Sur la boutique, les resultats portent l'URL Shopify reelle du produit,
       de la collection ou de la page. Un adaptateur externe peut la remplacer
       (l'apercu autonome s'en sert), sans que ce fichier connaisse l'apercu. */
    if (window.MAISON_LINK_ADAPTER) {
      var custom = window.MAISON_LINK_ADAPTER(url);
      if (custom) return custom;
    }
    return 'href="' + escapeHtml(url || searchUrl) + '"';
  }

  function productMarkup(item) {
    var media = item.image
      ? '<img src="' + escapeHtml(item.image) + '" alt="" loading="lazy">'
      : '<span class="srch__ph" aria-hidden="true"></span>';
    return '<li><a class="srch__product" ' + linkAttrs(item.url) + '>' +
      '<span class="srch__thumb">' + media + '</span>' +
      '<span class="srch__body">' +
        '<span class="srch__name">' + escapeHtml(item.title) + '</span>' +
        (item.meta ? '<span class="srch__meta">' + escapeHtml(item.meta) + '</span>' : '') +
        (item.price ? '<span class="srch__price">' + escapeHtml(item.price) + '</span>' : '') +
      '</span></a></li>';
  }

  function listMarkup(title, items) {
    if (!items || !items.length) return '';
    return '<section class="srch__group">' +
      '<p class="t-label srch__group-title">' + title + '</p>' +
      '<ul class="srch__list">' + items.join('') + '</ul></section>';
  }

  function render(data, terms) {
    var products = (data.products || []).map(productMarkup);
    var collections = (data.collections || []).map(function (c) {
      return '<li><a class="srch__row" ' + linkAttrs(c.url) + '>' + escapeHtml(c.title) + '</a></li>';
    });
    var pages = (data.pages || []).map(function (p) {
      return '<li><a class="srch__row" ' + linkAttrs(p.url) + '>' + escapeHtml(p.title) + '</a></li>';
    });

    var total = products.length + collections.length + pages.length;
    if (initial) initial.hidden = true;

    if (!total) {
      results.innerHTML = '';
      if (empty) {
        empty.hidden = false;
        var link = empty.querySelector('[data-search-empty-terms]');
        if (link) link.textContent = terms;
      }
      if (status) status.textContent = 'Aucun résultat.';
      return;
    }

    if (empty) empty.hidden = true;
    results.innerHTML =
      listMarkup('Créations', products) +
      listMarkup('Collections', collections) +
      listMarkup('La Maison', pages) +
      '<a class="cta srch__all" href="' + searchUrl + '?q=' + encodeURIComponent(terms) + '">' +
      'Voir tous les résultats<span class="cta__arrow" aria-hidden="true"></span></a>';

    if (status) status.textContent = total + ' résultat(s).';
    if (window.MaisonPreviewRoutes) window.MaisonPreviewRoutes.bind();
  }

  var timer = null;

  function run() {
    var terms = input.value.trim();
    if (terms.length < 2) {
      results.innerHTML = '';
      if (empty) empty.hidden = true;
      if (initial) initial.hidden = false;
      if (status) status.textContent = '';
      return;
    }
    adapter.query(terms)
      .then(function (data) { render(data, terms); })
      .catch(function () {
        results.innerHTML = '';
        if (status) status.textContent = 'La recherche est momentanément indisponible.';
      });
  }

  if (input) {
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(run, 220);
    });
  }

  document.addEventListener('click', function (event) {
    var opener = event.target.closest ? event.target.closest('[data-search-open]') : null;
    if (!opener) return;
    event.preventDefault();
    if (window.MaisonModal) window.MaisonModal.open(panel, opener);
    /* Le focus arrive après l'ouverture pour éviter tout saut de mise en page
       quand le clavier mobile apparaît. */
    setTimeout(function () { if (input) input.focus(); }, 60);
  });

  /* Les résultats se ferment avec le panneau : on ne laisse pas d'état obsolète. */
  panel.addEventListener('transitionend', function () {
    if (panel.classList.contains('is-open')) return;
    if (input) input.value = '';
    results.innerHTML = '';
    if (empty) empty.hidden = true;
    if (initial) initial.hidden = false;
  });
})();
