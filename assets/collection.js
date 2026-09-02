/**
 * GOLD MINES — Collection page: mobile filter drawer + auto-submit facets.
 */
(function () {
  'use strict';

  var drawer = document.querySelector('[data-gm-filter-drawer]');
  var openBtn = document.querySelector('[data-gm-filter-open]');
  var closeBtn = document.querySelector('[data-gm-filter-close]');
  var scrim = document.querySelector('[data-gm-scrim]');

  if (drawer && openBtn) {
    openBtn.addEventListener('click', function () {
      drawer.classList.add('is-open');
      scrim && scrim.classList.add('is-open');
      document.documentElement.style.overflow = 'hidden';
    });
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    scrim && scrim.classList.remove('is-open');
    document.documentElement.style.overflow = '';
  }
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (scrim) scrim.addEventListener('click', closeDrawer);

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
})();
