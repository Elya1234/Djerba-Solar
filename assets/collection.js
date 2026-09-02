/**
 * GOLD MINES — Collection page: mobile filter drawer, auto-submit facets,
 * product card metal-swatch image preview.
 */
(function () {
  'use strict';

  var drawer = document.querySelector('[data-gm-filter-drawer]');
  var openBtn = document.querySelector('[data-gm-filter-open]');
  var closeBtn = document.querySelector('[data-gm-filter-close]');
  var scrim = document.querySelector('[data-gm-scrim]');
  var lastFocusedBeforeDrawer = null;

  if (drawer && openBtn) {
    openBtn.addEventListener('click', function () {
      lastFocusedBeforeDrawer = openBtn;
      drawer.classList.add('is-open');
      scrim && scrim.classList.add('is-open');
      document.documentElement.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
    });
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    scrim && scrim.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (lastFocusedBeforeDrawer) lastFocusedBeforeDrawer.focus();
  }
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (scrim) scrim.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  document.querySelectorAll('[data-gm-facets-form] input[type="checkbox"], [data-gm-facets-form] input[type="number"]').forEach(function (input) {
    input.addEventListener('change', function () {
      var form = input.closest('form');
      if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
    });
  });

  var sortSelect = document.querySelector('[data-gm-sort-select]');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      var form = document.getElementById(sortSelect.getAttribute('form'));
      if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
    });
  }

  /* ---- Product card: metal swatch previews the matching variant image ---- */
  document.querySelectorAll('[data-gm-product-card]').forEach(function (card) {
    var img = card.querySelector('[data-gm-card-image]');
    var swatches = card.querySelectorAll('[data-gm-card-swatch]');
    if (!img || !swatches.length) return;
    var originalSrc = img.currentSrc || img.src;
    var selectedSrc = null;

    swatches.forEach(function (swatch) {
      swatch.addEventListener('mouseenter', function () {
        img.src = swatch.getAttribute('data-image');
      });
      swatch.addEventListener('mouseleave', function () {
        img.src = selectedSrc || originalSrc;
      });
      swatch.addEventListener('click', function (e) {
        e.preventDefault();
        selectedSrc = swatch.getAttribute('data-image');
        img.src = selectedSrc;
        swatches.forEach(function (s) { s.setAttribute('aria-pressed', String(s === swatch)); });
      });
      swatch.addEventListener('focus', function () {
        img.src = swatch.getAttribute('data-image');
      });
      swatch.addEventListener('blur', function () {
        img.src = selectedSrc || originalSrc;
      });
    });
  });
})();
