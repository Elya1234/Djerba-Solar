/**
 * GOLD MINES — Predictive search overlay.
 * Uses Shopify's native /search/suggest.json endpoint (Search & Discovery).
 */
(function () {
  'use strict';

  var modal = document.querySelector('[data-gm-search-modal]');
  var openTriggers = document.querySelectorAll('[data-gm-search-toggle]');
  var closeBtn = document.querySelector('[data-gm-search-close]');
  var input = document.querySelector('[data-gm-search-input]');
  var resultsEl = document.querySelector('[data-gm-search-results]');
  var hintEl = document.querySelector('[data-gm-search-hint]');
  if (!modal) return;

  var debounceTimer;
  var lastFocused = null;

  function openModal() {
    modal.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(function () { input && input.focus(); }, 50);
  }
  function closeModal() {
    modal.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }

  openTriggers.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      lastFocused = btn;
      openModal();
    });
  });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
  });

  function renderResults(data) {
    if (!resultsEl) return;
    var products = (data.resources.results.products || []);
    var others = []
      .concat(data.resources.results.collections || [])
      .concat(data.resources.results.pages || [])
      .concat(data.resources.results.articles || []);

    if (!products.length && !others.length) {
      resultsEl.innerHTML = '<p class="gm-search-modal__hint">Aucun résultat. Essayez un autre mot-clé.</p>';
      resultsEl.hidden = false;
      return;
    }

    var html = '';
    if (products.length) {
      html += '<div><div class="gm-search-modal__group-title">Créations</div><div class="gm-search-modal__products">';
      products.forEach(function (p) {
        html += '<a href="' + p.url + '" style="display:block;">' +
          (p.featured_image ? '<img src="' + p.featured_image + '" alt="" style="aspect-ratio:3/4;object-fit:cover;width:100%;border-radius:2px;">' : '') +
          '<span style="display:block;margin-top:.6rem;font-family:var(--font-display);font-size:1.4rem;">' + p.title + '</span>' +
          '<span style="display:block;color:var(--gm-text-muted);font-size:1.2rem;">' + p.price + '</span>' +
        '</a>';
      });
      html += '</div></div>';
    }
    if (others.length) {
      html += '<div><div class="gm-search-modal__group-title">Pages & collections</div><div class="gm-search-modal__links">';
      others.forEach(function (o) {
        html += '<a href="' + o.url + '">' + o.title + '</a>';
      });
      html += '</div></div>';
    }
    resultsEl.innerHTML = html;
    resultsEl.hidden = false;
  }

  if (input) {
    input.addEventListener('input', function () {
      var q = input.value.trim();
      clearTimeout(debounceTimer);
      if (q.length < 2) {
        resultsEl.hidden = true;
        if (hintEl) hintEl.hidden = false;
        return;
      }
      if (hintEl) hintEl.hidden = true;
      debounceTimer = setTimeout(function () {
        fetch('/search/suggest.json?q=' + encodeURIComponent(q) + '&resources[type]=product,collection,page,article&resources[limit]=8')
          .then(function (r) { return r.json(); })
          .then(renderResults)
          .catch(function () {});
      }, 220);
    });
  }
})();
